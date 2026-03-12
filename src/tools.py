import boto3
from datetime import datetime
from typing import Optional, Dict
from langchain.tools import tool
from pydantic import BaseModel, Field

# Inicializamos DynamoDB
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('SolicitudesCredito')

# --- ESQUEMAS DE ENTRADA (Pydantic) ---

class CreditCheckInput(BaseModel):
    """Input detallado para el Simulador de Crédito."""
    dni: str = Field(description="DNI del cliente")
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

# --- HERRAMIENTAS (Tools) ---

@tool(args_schema=CreditCheckInput)
def simulate_credit_check(dni: str, ingreso_mensual: float, monto_credito: float, 
                          valor_propiedad: float, plazo_anos: int, destino: str, 
                          haberes_bna: bool) -> str:
    """
    Realiza una evaluación financiera compleja. 
    Calcula la relación cuota-ingreso y el porcentaje de financiación (LTV).
    """
    # Lógica de simulación: Calculamos cuota estimada (simplificado para la demo)
    tasa_anual = 0.05 if haberes_bna else 0.08  # Tasa preferencial si tiene cuenta
    cuota_estimada = (monto_credito * (1 + tasa_anual)) / (plazo_anos * 12)
    
    # Regla 1: Relación Cuota-Ingreso (RCI) no debe superar el 30%
    ratio_ingreso = (cuota_estimada / ingreso_mensual) * 100
    
    # Regla 2: Porcentaje de financiación (LTV) no debe superar el 80%
    ltv = (monto_credito / valor_propiedad) * 100

    if ratio_ingreso <= 30 and ltv <= 80:
        return (f"✅ ANÁLISIS: Cuota estimada de ${cuota_estimada:.2f} (RCI: {ratio_ingreso:.1f}%). "
                f"Financiación: {ltv:.1f}%. RESULTADO: Pre-aprobado. "
                f"Sugerencia: Cambiar estado a 'DOCUMENTACION' y pedir DNI/Recibos.")
    
    motivo = "RCI alto" if ratio_ingreso > 30 else "Financiación excedida"
    return f"❌ RESULTADO: Rechazado para proceso automático por {motivo}. Requiere revisión manual."

@tool(args_schema=SolicitudInput)
def gestionar_solicitud(dni: str, estado: str, datos_extra: dict = None) -> str:
    """
    Guarda o actualiza el estado y datos del cliente en DynamoDB.
    Usa esta herramienta CADA VEZ que el estado del proceso cambie.
    """
    try:
        item = {
            'dni': dni,
            'estado': estado,
            'ultima_actualizacion': datetime.now().isoformat()
        }
        if datos_extra:
            item.update(datos_extra)
        
        table.put_item(Item=item)
        return f"✅ Base de Datos: Solicitud {dni} actualizada a estado '{estado}'."
    except Exception as e:
        return f"❌ Error DynamoDB: {str(e)}"

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