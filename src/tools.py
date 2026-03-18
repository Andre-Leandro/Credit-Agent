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
    """Usa Claude 3.5 Sonnet para peritar el DNI en la imagen."""
    bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')
    
    try:
        # 1. Extraer imagen del historial
        mensajes = state.get("messages", [])
        image_b64 = None
        for m in reversed(mensajes):
            if isinstance(m, HumanMessage) and isinstance(m.content, list):
                for parte in m.content:
                    if isinstance(parte, dict) and parte.get("type") == "image":
                        image_b64 = parte.get("source", {}).get("data")
                        if image_b64: break
            if image_b64: break

        if not image_b64:
            return "❌ No se encontró imagen en el chat."

        pure_b64 = image_b64.split(",")[1] if "," in image_b64 else image_b64

        prompt_perito = f"""
        Analizá la imagen adjunta. 
        DNI ESPERADO: {dni_esperado}

        INSTRUCCIONES CRÍTICAS:
        - Si la imagen NO es un DNI o documento de identidad, respondé con 'es_documento_valido': false y 'match': false.
        - Si es un DNI, extraé el número y comparalo.
        - BAJO NINGUNA CIRCUNSTANCIA respondas con texto natural. 
        - Tu respuesta debe ser EXCLUSIVAMENTE un objeto JSON válido.

        FORMATO DE SALIDA OBLIGATORIO:
        {{
            "match": bool,
            "dni_detectado": "string o 'N/A'",
            "es_documento_valido": bool,
            "motivo_rechazo": "Explicación breve si falló",
            "confianza": float (0.0 a 1.0)
        }}
        """

        # 2. Llamada a Bedrock
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": "image/png", "data": pure_b64}
                        },
                        {"type": "text", "text": prompt_perito}
                    ]
                }
            ]
        })

        response = bedrock_runtime.invoke_model(
            modelId="anthropic.claude-3-5-sonnet-20240620-v1:0",
            body=body
        )

        # --- ACÁ ESTÁ EL FIX ---
        # Leemos el body una sola vez y lo guardamos
        response_body = response['body'].read().decode('utf-8')
        result = json.loads(response_body)
        raw_text = result['content'][0]['text']

        # Limpiamos por si Claude manda texto fuera del JSON (Markdown backticks, etc)
        if "{" in raw_text:
            start = raw_text.find("{")
            end = raw_text.rfind("}") + 1
            analisis = json.loads(raw_text[start:end])
        else:
            return f"❌ Error: La IA no devolvió JSON. Respuesta: {raw_text}"

        if analisis.get('match') and analisis.get('es_documento_valido') and analisis.get('confianza', 0) > 0.7:
            return f"✅ VALIDACIÓN EXITOSA: DNI {analisis['dni_detectado']} confirmado."
        
        return f"❌ VALIDACIÓN FALLIDA: {analisis.get('motivo_rechazo', 'No coincide el DNI.')}"

    except Exception as e:
        return f"❌ Error en peritaje: {str(e)}"

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
    Busca las fotos en el historial de mensajes, las sube a S3 y 
    actualiza el estado a REVISION.
    """
    BUCKET_NAME = "credit-agent-documentacion"
    imagenes_encontradas = []

    try:
        # 1. Buscamos en los mensajes del estado (esto SIEMPRE está ahí)
        mensajes = state.get("messages", [])
        
        # 2. Recorremos los mensajes del último al primero buscando fotos
        for m in reversed(mensajes):
            if isinstance(m, HumanMessage) and isinstance(m.content, list):
                for parte in m.content:
                    # Buscamos el bloque que sea de tipo 'image'
                    if isinstance(parte, dict) and parte.get("type") == "image":
                        b64_data = parte.get("source", {}).get("data")
                        if b64_data:
                            imagenes_encontradas.append(b64_data)
                
                # Si ya encontramos fotos en el mensaje más reciente, no seguimos buscando
                if imagenes_encontradas:
                    break

        if not imagenes_encontradas:
            return "❌ Error: El agente ve las fotos pero la Tool no pudo extraer los bytes del historial."

        # 3. Subida a S3 (el proceso que ya conocés)
        links_s3 = []
        for idx, b64_str in enumerate(imagenes_encontradas):
            # Limpiamos por las dudas si el b64 trae basura
            pure_b64 = b64_str.split(",")[1] if "," in b64_str else b64_str
            image_bytes = base64.b64decode(pure_b64)
            
            file_key = f"{dni}/dni_{idx}_{datetime.now().strftime('%H%M%S')}.png"
            s3.put_object(Bucket=BUCKET_NAME, Key=file_key, Body=image_bytes, ContentType='image/png')
            links_s3.append(f"s3://{BUCKET_NAME}/{file_key}")

        # 4. Actualizamos DynamoDB
        table.update_item(
            Key={'dni': dni},
            UpdateExpression="SET estado = :est, fotos_s3 = :f, ultima_actualizacion = :t",
            ExpressionAttributeValues={
                ':est': 'REVISION',
                ':f': links_s3,
                ':t': datetime.now().isoformat()
            }
        )

        return f"✅ ÉXITO: Se extrajeron {len(links_s3)} fotos del chat y se subieron a S3 para el DNI {dni}."

    except Exception as e:
        return f"❌ ERROR en persistir_documentacion: {str(e)}"