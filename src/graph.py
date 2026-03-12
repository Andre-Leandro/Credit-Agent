from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, SystemMessage
from .config import get_llm
from .tools import simulate_credit_check, consultar_estado_cliente, gestionar_solicitud

SYSTEM_PROMPT = """
Eres un Agente Orquestador de Crédito Hipotecario. Tu misión es guiar al cliente a través del flujo de solicitud, gestionando su estado en la base de datos.

FLUJO DEL PROCESO Y ESTADOS:
1. PRE_APROBACION: El cliente completa los datos del simulador y pasan la evaluación de la tools simulate_credit_check.
2. DOCUMENTACION: El cliente debe subir fotos de DNI y Recibos de sueldo y son efectivamente correctos.
3. REVISION: Los documentos han sido cargados y esperan validación humana.

REGLAS DE ACTUACIÓN:
- AL INICIAR: Si el cliente proporciona su DNI o lo detectas en una imagen, usa SIEMPRE `consultar_estado_cliente` para ver si ya tiene un trámite iniciado.
- SIMULACIÓN: Para evaluar el crédito, necesitas: DNI, ingreso mensual, monto solicitado, valor de la propiedad, plazo en años, destino y si posee haberes en BNA.
- PERSISTENCIA: Cada vez que el proceso avance (ej: tras una pre-aprobación exitosa), usa `gestionar_solicitud` para actualizar el estado del cliente a 'DOCUMENTACION' y guardar sus datos financieros.

REGLAS PARA IMÁGENES:
1. Describe brevemente qué ves (DNI, Recibo, o imagen genérica).
2. Si es un DNI: Extrae el número y verifica el estado del cliente en la DB.
3. Si es un COMPROBANTE DE INGRESOS: Extrae el monto y actualiza la solicitud en la DB usando `gestionar_solicitud` guardando el dato en 'datos_extra'.
4. Si la imagen no es útil: Explica qué ves y pide el documento correcto según el estado actual del trámite.

ESTILO DE COMUNICACIÓN:
- Habla en ESPAÑOL (Argentina/Latam), sé amable y profesional.
- Si el cliente ya está en 'DOCUMENTACION', no le pidas de nuevo los datos del simulador; pídele los archivos que faltan.
- Sé conciso y guía al usuario al siguiente paso lógico.
"""

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

_llm = None

def get_bound_llm():
    """Inicializa Bedrock y las todas las tools necesarias"""
    global _llm
    if _llm is None:
        # IMPORTANTE: Registramos las 4 herramientas aquí
        _llm = get_llm().bind_tools([
            simulate_credit_check,  
            consultar_estado_cliente, 
            gestionar_solicitud
        ])
    return _llm

def agent_node(state: AgentState):
    messages = state["messages"]

    # --- DEBUGGING DETALLADO ---
    print("\n" + "="*80)
    print("🔍 DEBUGGING - CONTENIDO DEL AGENTE")
    print("="*80)
    
    last_msg = messages[-1]
    print(f"✓ Último mensaje tipo: {type(last_msg)}")
    print(f"✓ Contenido tipo: {type(last_msg.content)}")
    
    if hasattr(last_msg, 'content'):
        if isinstance(last_msg.content, str):
            print(f"✓ Contenido (string): {last_msg.content[:200]}")
        elif isinstance(last_msg.content, list):
            print(f"✓ Contenido es LISTA con {len(last_msg.content)} bloques:")
            for i, block in enumerate(last_msg.content):
                if isinstance(block, dict):
                    print(f"  Bloque {i}:")
                    for key, value in block.items():
                        if key == "image_url" and isinstance(value, dict):
                            if "url" in value:
                                url_preview = value["url"][:100] + "..." if len(value["url"]) > 100 else value["url"]
                                print(f"    - {key}: {url_preview}")
                            else:
                                print(f"    - {key}: {value.keys()}")
                        elif key == "text":
                            print(f"    - {key}: {value[:100]}...")
                        else:
                            print(f"    - {key}: {str(value)[:100]}")
                else:
                    print(f"  Bloque {i} tipo: {type(block)}")
        else:
            print(f"✓ Contenido tipo desconocido: {last_msg.content}")
    
    # Mostrar todos los mensajes en el estado
    print(f"\n✓ Total de mensajes en state: {len(messages)}")
    for idx, msg in enumerate(messages):
        print(f"  Msg {idx}: {type(msg).__name__}")
    
    print("="*80 + "\n")
    # --- FIN DEBUGGING ---

    if not any(m.type == "system" for m in messages):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages

    llm = get_bound_llm()
    response = llm.invoke(messages)
    return {"messages": [response]}

tool_node = ToolNode([simulate_credit_check, consultar_estado_cliente, gestionar_solicitud])

def build_graph():
    # ... (todo el builder queda exactamente igual) ...
    builder = StateGraph(AgentState)
    builder.add_node("agent", agent_node)
    builder.add_node("tools", tool_node)
    builder.set_entry_point("agent")
    builder.add_conditional_edges("agent", tools_condition, {"tools": "tools", "__end__": END})
    builder.add_edge("tools", "agent")
    return builder.compile()