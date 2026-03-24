import boto3
from datetime import datetime
from typing import Optional, List, Annotated
from langchain.tools import tool
from decimal import Decimal  #
from pydantic import BaseModel, Field
import base64
from langgraph.prebuilt import InjectedState
from langchain_core.messages import HumanMessage
import json

# Inicializamos DynamoDB
REGION = 'us-east-1'
dynamodb = boto3.resource('dynamodb', region_name=REGION)
s3 = boto3.client('s3', region_name=REGION)
table = dynamodb.Table('SolicitudesCredito')
BUCKET_S3 = "credit-agent-documentacion"

# --- ESQUEMAS DE ENTRADA (Pydantic) ---
class DocumentacionInput(BaseModel):
    dni: str = Field(description="DNI del cliente")
    tipo_validacion: str = Field(description="Modo: 'identidad' (DNI/Recibo) o 'propiedad' (Títulos/Planos)")

class CreditCheckInput(BaseModel):
    """Input detallado para el Simulador de Crédito."""
    dni: str = Field(description="DNI del cliente")
    email: str = Field(description="Email del cliente")
    ingreso_mensual: float = Field(description="Ingreso neto mensual")
    monto_credito: float = Field(description="Monto total del crédito solicitado")
    valor_propiedad: float = Field(description="Valor de la propiedad")
    plazo_anos: int = Field(description="Plazo del crédito en años (ej: 15)")
    destino: str = Field(description="Destino del crédito (ej: Construcción, Compra)")
    haberes_bna: bool = Field(description="¿Posee haberes en BNA? (True/False)")

class SolicitudInput(BaseModel):
    """Input para gestionar o consultar la base de datos."""
    dni: str = Field(description="DNI del cliente")
    estado: Optional[str] = Field(None, description="Nuevo estado: 'PRE_APROBACION', 'DOCUMENTACION', etc.")
    direccion: Optional[str] = Field(None, description="Dirección o zona de la propiedad")
    tipo_propiedad: Optional[str] = Field(None, description="Casa, Departamento, etc.")
    ambientes: Optional[int] = Field(None, description="Cantidad de ambientes")

# 1. Agregamos el esquema de entrada
class VisionInput(BaseModel):
    dni_esperado: str = Field(description="DNI del cliente para validar titularidad.")
    tipo_validacion: str = Field(description="Define qué analizar: 'identidad' (DNI/Recibo) o 'propiedad' (Escritura/Planos)")

# --- HERRAMIENTAS (Tools) ---

# 2. La Tool Maestra
@tool(args_schema=VisionInput)
def validar_documento_vision(dni_esperado: str, tipo_validacion: str, state: Annotated[dict, InjectedState]) -> str:
    """
    Realiza un peritaje técnico de imágenes. 
    En modo 'identidad' busca DNI y Recibo. En modo 'propiedad' busca Escritura y Planos.
    """
    bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')
    
    try:
        # 1. Extracción de imágenes (Mantenemos tu lógica robusta)
        mensajes = state.get("messages", [])
        bloques_imagenes_claude = []
        for m in reversed(mensajes):
            if isinstance(m, HumanMessage) and isinstance(m.content, list):
                for parte in m.content:
                    if isinstance(parte, dict) and parte.get("type") == "image":
                        b64_data = parte.get("source", {}).get("data")
                        pure_b64 = b64_data.split(",")[1] if "," in b64_data else b64_data
                        bloques_imagenes_claude.append({
                            "type": "image",
                            "source": {"type": "base64", "media_type": "image/png", "data": pure_b64}
                        })
                if bloques_imagenes_claude: break

        if not bloques_imagenes_claude:
            return f"❌ Error: No encontré imágenes en el último mensaje para validar {tipo_validacion}."

        # 2. SELECCIÓN DE PROMPT DETALLADO SEGÚN EL CASO
        if tipo_validacion == "identidad":
            prompt_perito = f"""
            Actúa como un experto en validación de identidad bancaria. 
            OBJETIVO: Validar el legajo de identidad del DNI {dni_esperado}.
            
            REQUISITOS TÉCNICOS:
            1. FRENTE DNI: Debe ser legible, mostrar el número {dni_esperado} y la foto del rostro.
            2. DORSO DNI: Debe mostrar el código de barras y ser del mismo ejemplar que el frente.
            3. RECIBO DE SUELDO: Debe ser un documento oficial (PDF o foto de papel), legible, y el nombre/DNI debe coincidir con {dni_esperado}.

            INSTRUCCIONES DE RESPUESTA:
            Si algo falla, sé específico (ej: "DNI borroso", "Recibo de otra persona").
            
            RESPONDÉ ÚNICAMENTE EN JSON:
            {{
                "frente_ok": bool,
                "dorso_ok": bool,
                "recibo_ok": bool,
                "dni_detectado": "string",
                "motivo_rechazo": "string",
                "todo_validado": bool
            }}
            """
        else: # MODO PROPIEDAD
            prompt_perito = f"""
            Actúa como un perito técnico inmobiliario.
            OBJETIVO: Validar la documentación técnica de la propiedad para el cliente {dni_esperado}.
            
            REQUISITOS TÉCNICOS:
            1. TÍTULO/ESCRITURA: Debe ser un documento notarial, mostrar sellos, firmas de escribano o número de matrícula de folio real. 
            2. PLANOS: Debe mostrar el dibujo técnico de la propiedad, sellos municipales o de catastro. Debe ser legible.
            3. COHERENCIA: Verifica que los documentos se refieran a una propiedad inmueble.

            INSTRUCCIONES DE RESPUESTA:
            Si falta la escritura o los planos, o no son legibles, indícalo en 'motivo_rechazo'.

            RESPONDÉ ÚNICAMENTE EN JSON:
            {{
                "titulo_ok": bool,
                "planos_ok": bool,
                "todo_validado": bool,
                "motivo_rechazo": "string"
            }}
            """

        # 3. Invocación a Claude 3.5 Sonnet
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {"role": "user", "content": bloques_imagenes_claude + [{"type": "text", "text": prompt_perito}]}
            ]
        })

        response = bedrock_runtime.invoke_model(modelId="anthropic.claude-3-5-sonnet-20240620-v1:0", body=body)
        raw_text = json.loads(response['body'].read().decode('utf-8'))['content'][0]['text']
        
        # Parseo de JSON
        start, end = raw_text.find("{"), raw_text.rfind("}") + 1
        analisis = json.loads(raw_text[start:end])

        # 4. VERDICTO FINAL (Diferenciando el mensaje para el Agente)
        if analisis.get('todo_validado'):
            if tipo_validacion == "identidad":
                return f"✅ LEGAJO IDENTIDAD VALIDADO: El DNI {dni_esperado} y el recibo son correctos. Procede a persistir para pasar a REVISION."
            else:
                return f"✅ TÍTULOS DE PROPIEDAD VALIDADOS: Escritura y planos del cliente {dni_esperado} aprobados. Procede a persistir para pasar a TASACION."
        else:
            return f"❌ DOCUMENTACIÓN RECHAZADA ({tipo_validacion}): {analisis.get('motivo_rechazo')}."

    except Exception as e:
        return f"❌ Error crítico en peritaje {tipo_validacion}: {str(e)}"


@tool(args_schema=CreditCheckInput)
def simulate_credit_check(dni: str, email: str, ingreso_mensual: float, monto_credito: float, 
                          valor_propiedad: float, plazo_anos: int, destino: str, 
                          haberes_bna: bool) -> str:
    """
    Realiza una evaluación financiera y registra la solicitud.
    """
    # 1. Cálculos (Python usa floats acá, no hay drama)
    tasa_anual = 0.05 if haberes_bna else 0.08
    cuota_estimada = (monto_credito * (1 + tasa_anual)) / (plazo_anos * 12)
    ratio_ingreso = (cuota_estimada / ingreso_mensual) * 100
    ltv = (monto_credito / valor_propiedad) * 100

    if ratio_ingreso <= 30 and ltv <= 80:
        try:
            # 2. TRANSFORMACIÓN: Convertimos todo a Decimal para que DynamoDB no llore
            # Tip: Convertir a str primero es la forma más segura de mantener la precisión
            solicitud_item = {
                'dni': dni,
                'email': email,
                'estado': 'DOCUMENTACION',
                'ingreso_mensual': Decimal(str(ingreso_mensual)),
                'monto_credito': Decimal(str(monto_credito)),
                'valor_propiedad': Decimal(str(valor_propiedad)),
                'plazo_anos': Decimal(str(plazo_anos)),
                'destino': destino,
                'haberes_bna': haberes_bna,
                'cuota_estimada': Decimal(str(round(cuota_estimada, 2))),
                'rci': Decimal(str(round(ratio_ingreso, 2))),
                'ltv': Decimal(str(round(ltv, 2))),
                'ultima_actualizacion': datetime.now().isoformat()
            }
            
            table.put_item(Item=solicitud_item)
            
            return f"✅ Pre-aprobado. Registro creado para DNI {dni}."
        
        except Exception as e:
            return f"❌ Error al guardar en base de datos: {str(e)}"
    
    return "❌ Rechazado por política de riesgo."


@tool(args_schema=SolicitudInput)
def gestionar_solicitud(
    dni: str, 
    estado: str, 
    direccion: str = None, 
    tipo_propiedad: str = None, 
    ambientes: int = None, 
) -> str:
    """
    Actualiza el estado del trámite en DynamoDB. 
    Opcionalmente registra datos de una propiedad si el usuario los proporcionó.
    """
    try:
        # 1. Base: Siempre actualizamos estado y fecha
        update_expr = "SET estado = :est, ultima_actualizacion = :f"
        values = {
            ":est": estado,
            ":f": datetime.now().isoformat()
        }

        # 2. Diccionario de mapeo para campos extras
        datos_mapeo = {
            "prop_direccion": direccion,
            "prop_tipo": tipo_propiedad,
            "prop_ambientes": ambientes,
        }

        # Solo agregamos al UpdateExpression lo que NO es None
        for key, val in datos_mapeo.items():
            if val is not None:
                update_expr += f", {key} = :{key}"
                values[f":{key}"] = val

        # 3. Ejecución
        table.update_item(
            Key={'dni': dni},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=values
        )
        
        return f"✅ DB: Trámite {dni} actualizado a '{estado}' (con datos extra: {list(filter(lambda k: datos_mapeo[k] is not None, datos_mapeo))})."
    except Exception as e:
        return f"❌ Error en gestionar_solicitud: {str(e)}"
    
@tool
def consultar_estado_cliente(dni: str) -> str:
    """
    Consulta en qué etapa del proceso se encuentra un cliente por su DNI.
    Útil para retomar conversaciones o validar progresos.
    """
    try:
        response = table.get_item(Key={'dni': dni})
        if 'Item' in response:
            item = response['Item']
            return f"ℹ️ INFO DB: El cliente {dni} está en estado '{item['estado']}'. Datos: {item}"
        return f"⚠️ INFO DB: No se encontró ninguna solicitud previa para el DNI {dni}."
    except Exception as e:
        return f"❌ Error DynamoDB: {str(e)}"
    

@tool(args_schema=DocumentacionInput)
def persistir_documentacion_validada(dni: str, tipo_validacion: str, state: Annotated[dict, InjectedState]) -> str:
    """
    Sube fotos a S3 y actualiza DynamoDB. 
    Diferencia entre fotos de identidad (REVISION) y fotos de propiedad (TASACION).
    """
    BUCKET_NAME = "credit-agent-documentacion"
    s3 = boto3.client('s3')
    
    # Definimos etiquetas de carpetas según el tipo para que S3 quede prolijo
    if tipo_validacion == "identidad":
        subcarpetas = ["frente", "dorso", "recibo"]
        campo_dynamo = "fotos_s3"
        nuevo_estado = "REVISION"
    else:
        subcarpetas = ["escritura", "planos"]
        campo_dynamo = "fotos_documentacion_s3" # El campo que pediste
        nuevo_estado = "TASACION"

    imagenes_encontradas = []

    try:
        # 1. Extraer las imágenes del historial
        mensajes = state.get("messages", [])
        for m in reversed(mensajes):
            if isinstance(m, HumanMessage) and isinstance(m.content, list):
                for parte in m.content:
                    if isinstance(parte, dict) and parte.get("type") == "image":
                        b64_data = parte.get("source", {}).get("data")
                        if b64_data:
                            imagenes_encontradas.append(b64_data)
                if imagenes_encontradas:
                    break

        if not imagenes_encontradas:
            return f"❌ Error: No encontré las fotos de {tipo_validacion} para guardar."

        # 2. Subida organizada a S3 (Mantenemos tu lógica de rutas)
        links_s3 = []
        timestamp = datetime.now().strftime('%H%M%S')
        
        for idx, b64_str in enumerate(imagenes_encontradas):
            pure_b64 = b64_str.split(",")[1] if "," in b64_str else b64_str
            image_bytes = base64.b64decode(pure_b64)
            
            # Carpeta dinámica: dni/frente/ o dni/escritura/
            folder_name = subcarpetas[idx] if idx < len(subcarpetas) else f"extra_{idx}"
            file_key = f"{dni}/{folder_name}/doc_{timestamp}.png"
            
            s3.put_object(
                Bucket=BUCKET_NAME, 
                Key=file_key, 
                Body=image_bytes, 
                ContentType='image/png'
            )
            links_s3.append(f"s3://{BUCKET_NAME}/{file_key}")

        # 3. Actualizamos DynamoDB usando el campo y estado dinámicos
        table.update_item(
            Key={'dni': dni},
            UpdateExpression=f"SET estado = :est, {campo_dynamo} = :f, ultima_actualizacion = :t",
            ExpressionAttributeValues={
                ':est': nuevo_estado,
                ':f': links_s3,
                ':t': datetime.now().isoformat()
            }
        )

        return (f"✅ ÉXITO ({tipo_validacion}): Se guardaron {len(links_s3)} fotos. "
                f"El trámite del DNI {dni} pasó automáticamente al estado '{nuevo_estado}'. "
                f"Los links se guardaron en el campo '{campo_dynamo}'.")

    except Exception as e:
        return f"❌ ERROR en persistir_documentacion ({tipo_validacion}): {str(e)}"