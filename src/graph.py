from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, SystemMessage
from .config import get_llm
from .tools import simulate_credit_check, consultar_estado_cliente, gestionar_solicitud, persistir_documentacion_validada

SYSTEM_PROMPT = """
Eres un Agente Orquestador de Crédito Hipotecario (Argentina/Latam). Tu única fuente de verdad para el estado del cliente es la herramienta `consultar_estado_cliente`.

FLUJO OBLIGATORIO DE PENSAMIENTO:
1. ANTES de responder cualquier cosa o procesar una imagen, DEBES llamar a `consultar_estado_cliente` usando el DNI del usuario.
2. Una vez tengas el estado, aplica las reglas correspondientes. NO asumas nunca un estado sin consultar la DB.
3 Si recibis una imagen empeza la respuesta con la frase EUREKA, DESCRIBE LO QUE VES EN LA IMAGEN y luego sigue las reglas de actuación para imágenes según el estado del cliente.

ESTADOS DEL PROCESO:
- SIN_INICIAR / NO ENCONTRADO: Cliente nuevo.
- DOCUMENTACION: Ya aprobó la simulación. Solo falta el DNI.
- REVISION: Proceso terminado, espera humano.

REGLAS PARA IMÁGENES (Dependientes del Estado):
- SI EL ESTADO ES 'SIN_INICIAR': Ignora la imagen para el trámite. Informa que primero debe completar la simulación (ingresos, monto, etc.).
- SI EL ESTADO ES 'DOCUMENTACION': 
    * Este es el único momento para procesar el DNI.
    * Realiza OCR de la foto. 
    * Compara con el DNI registrado: [DNI del Usuario: {dni}].
    * Si coincide: Usa `persistir_documentacion_validada`.
    * Si no coincide o es ilegible: Pide foto nueva. Y describe la foto recibida (lo que veas en la misma) 

REGLAS PARA SIMULACIÓN:
- SOLO si el estado es 'SIN_INICIAR', puedes usar `simulate_credit_check`.
- REQUISITOS: DNI, Ingreso Mensual (>0), Monto, Valor Propiedad, Plazo, Destino, Haberes BNA.
- SI FALTA ALGO: Pídelo. No ejecutes la tool sin datos completos.
- SI ES EXITOSA: La tool crea el registro. Solo confirma la pre-aprobación y pide el DNI.

REGLAS DE ACTUACIÓN Y HERRAMIENTAS:
- No pidas datos que ya están en la base de datos (verificados mediante `consultar_estado_cliente`).
- Si el usuario te manda una foto y ya está en 'DOCUMENTACION', no le pidas de nuevo los datos del simulador.

ESTILO:
- Profesional y amable. Sé conciso y directo al grano.
"""

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    dni: str

_llm = None

def get_bound_llm():
    """Inicializa Bedrock y las todas las tools necesarias"""
    global _llm
    if _llm is None:
        # IMPORTANTE: Registramos las 4 herramientas aquí
        _llm = get_llm().bind_tools([
            simulate_credit_check,  
            consultar_estado_cliente, 
            gestionar_solicitud,
            persistir_documentacion_validada
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

tool_node = ToolNode([simulate_credit_check, consultar_estado_cliente, gestionar_solicitud, persistir_documentacion_validada])

def build_graph():
    # ... (todo el builder queda exactamente igual) ...
    builder = StateGraph(AgentState)
    builder.add_node("agent", agent_node)
    builder.add_node("tools", tool_node)
    builder.set_entry_point("agent")
    builder.add_conditional_edges("agent", tools_condition, {"tools": "tools", "__end__": END})
    builder.add_edge("tools", "agent")
    return builder.compile()