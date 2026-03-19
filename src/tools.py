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
    # Ya no le pedimos la lista de imágenes acá para que no mande fruta

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
    datos_extra: Optional[dict] = Field(None, description="Diccionario con datos del simulador u otros")

# 1. Agregamos el esquema de entrada
class VisionInput(BaseModel):
    dni_esperado: str = Field(description="El número de DNI que el usuario dijo tener y queremos verificar.")

# --- HERRAMIENTAS (Tools) ---

# 2. La Tool Maestra
@tool(args_schema=VisionInput)
def validar_documento_vision(dni_esperado: str, state: Annotated[dict, InjectedState]) -> str:
    """
    Analiza un conjunto de imágenes para validar: Frente DNI, Dorso DNI y Recibo de Sueldo.
    """
    bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')
    
    try:
        # 1. Extraer TODAS las imágenes del último mensaje del usuario
        mensajes = state.get("messages", [])
        bloques_imagenes_claude = []
        
        for m in reversed(mensajes):
            if isinstance(m, HumanMessage) and isinstance(m.content, list):
                for parte in m.content:
                    if isinstance(parte, dict) and parte.get("type") == "image":
                        b64_data = parte.get("source", {}).get("data")
                        # Limpiamos el base64 si es necesario
                        pure_b64 = b64_data.split(",")[1] if "," in b64_data else b64_data
                        
                        bloques_imagenes_claude.append({
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": pure_b64
                            }
                        })
                
                # Si encontramos imágenes en este mensaje, no seguimos buscando en anteriores
                if bloques_imagenes_claude:
                    break

        if not bloques_imagenes_claude:
            return "❌ No se encontraron imágenes en el chat. Por favor, subí las fotos de tu DNI (frente y dorso) y el recibo de sueldo."

        # 2. Prompt "Perito Combo"
        prompt_perito = f"""
        Analizá las imágenes adjuntas. Deben conformar el legajo del DNI: {dni_esperado}.
        
        TAREAS:
        1. FRENTE DNI: ¿Está presente? ¿Coincide el número con {dni_esperado}?
        2. DORSO DNI: ¿Está presente? ¿Es un documento válido? ¿Coincide el número con {dni_esperado}?
        3. RECIBO DE SUELDO: ¿Está presente? ¿Es un recibo legible y de la persona de {dni_esperado}?

        INSTRUCCIÓN: Si falta alguna de estas 3 cosas, indicá cuál falta en 'motivo_rechazo'.
        
        RESPONDÉ ÚNICAMENTE EN JSON:
        {{
            "frente_ok": bool,
            "dorso_ok": bool,
            "recibo_ok": bool,
            "dni_detectado": "numero o N/A",
            "motivo_rechazo": "Explicación detallada de qué falta o qué está mal",
            "todo_validado": bool (true solo si los 3 anteriores son true)
        }}
        """

        # 3. Llamada a Bedrock con el pack de imágenes
        # Metemos todas las imágenes + el texto en el mismo mensaje
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {
                    "role": "user",
                    "content": bloques_imagenes_claude + [{"type": "text", "text": prompt_perito}]
                }
            ]
        })

        response = bedrock_runtime.invoke_model(
            modelId="anthropic.claude-3-5-sonnet-20240620-v1:0",
            body=body
        )

        # 4. Procesar respuesta
        response_body = response['body'].read().decode('utf-8')
        result = json.loads(response_body)
        raw_text = result['content'][0]['text']

        # Limpieza de JSON
        start = raw_text.find("{")
        end = raw_text.rfind("}") + 1
        analisis = json.loads(raw_text[start:end])

        # 5. Veredicto Final
        if analisis.get('todo_validado'):
            return f"✅ LEGAJO COMPLETO Y VALIDADO: DNI {analisis['dni_detectado']} y recibo confirmados."
        else:
            errores = []
            if not analisis.get('frente_ok'): errores.append("Frente DNI")
            if not analisis.get('dorso_ok'): errores.append("Dorso DNI")
            if not analisis.get('recibo_ok'): errores.append("Recibo de Sueldo")
            
            return f"❌ LEGAJO INCOMPLETO/ERRÓNEO: {analisis.get('motivo_rechazo')}. Detectado problema en: {', '.join(errores)}."

    except Exception as e:
        return f"❌ Error en peritaje de legajo: {str(e)}"

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
def gestionar_solicitud(dni: str, estado: str, datos_extra: dict = None) -> str:
    try:
        # 1. Definimos la base: siempre cambiamos estado y fecha
        update_expr = "SET estado = :est, ultima_actualizacion = :f"
        values = {
            ":est": estado,
            ":f": datetime.now().isoformat()
        }

        # 2. Si vienen datos_extra, los "agregamos" al parche
        if datos_extra:
            for key, val in datos_extra.items():
                update_expr += f", {key} = :{key}"
                values[f":{key}"] = val

        # 3. Ejecutamos el parche real
        table.update_item(
            Key={'dni': dni}, # <--- Quién
            UpdateExpression=update_expr, # <--- Qué campos
            ExpressionAttributeValues=values # <--- Qué valores
        )
        
        return f"✅ Base de Datos: Solicitud {dni} parcheada a estado '{estado}'."
    except Exception as e:
        return f"❌ Error: {str(e)}"
    
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
def persistir_documentacion_validada(dni: str, state: Annotated[dict, InjectedState]) -> str:
    """
    Sube las fotos (Frente, Dorso, Recibo) a sus respectivas subcarpetas en S3
    y actualiza el estado del trámite en DynamoDB.
    """
    BUCKET_NAME = "credit-agent-documentacion"
    # Definimos el orden esperado de las carpetas
    subcarpetas = ["frente", "dorso", "recibo"]
    imagenes_encontradas = []

    try:
        # 1. Extraer las imágenes del historial (buscamos el último pack enviado)
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
            return "❌ Error: No se encontraron las imágenes para persistir."

        # 2. Subida organizada a S3
        links_s3 = []
        timestamp = datetime.now().strftime('%H%M%S')
        
        for idx, b64_str in enumerate(imagenes_encontradas):
            # Limpieza de base64
            pure_b64 = b64_str.split(",")[1] if "," in b64_str else b64_str
            image_bytes = base64.b64decode(pure_b64)
            
            # Determinamos la subcarpeta. Si hay más de 3 fotos, el resto va a 'otros'
            folder_name = subcarpetas[idx] if idx < len(subcarpetas) else f"extra_{idx}"
            
            # ARMAMOS LA RUTA: dni/subcarpeta/archivo.png
            file_key = f"{dni}/{folder_name}/doc_{timestamp}.png"
            
            s3.put_object(
                Bucket=BUCKET_NAME, 
                Key=file_key, 
                Body=image_bytes, 
                ContentType='image/png'
            )
            links_s3.append(f"s3://{BUCKET_NAME}/{file_key}")

        # 3. Actualizamos DynamoDB con los links organizados
        table.update_item(
            Key={'dni': dni},
            UpdateExpression="SET estado = :est, fotos_s3 = :f, ultima_actualizacion = :t",
            ExpressionAttributeValues={
                ':est': 'REVISION',
                ':f': links_s3,
                ':t': datetime.now().isoformat()
            }
        )

        return f"✅ ÉXITO: Se guardaron {len(links_s3)} fotos en las carpetas {', '.join(subcarpetas[:len(links_s3)])} para el DNI {dni}."

    except Exception as e:
        return f"❌ ERROR en persistir_documentacion: {str(e)}"