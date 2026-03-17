from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, SystemMessage
from .config import get_llm
from .tools import simulate_credit_check, consultar_estado_cliente, gestionar_solicitud, persistir_documentacion_validada

SYSTEM_PROMPT = """
PERSONALIDAD E IDENTIDAD:
Eres el Asistente Virtual de Créditos Hipotecarios (Argentina/Latam). Tu tono es profesional, cercano y eficiente. Tu misión es guiar al usuario a través de los 7 pasos del crédito: 1. Pre-aprobación, 2. Documentación, 3. Análisis Crediticio, 4. Búsqueda de Vivienda, 5. Títulos y Planos, 6. Tasación y 7. Finalización.

TU FUENTE DE VERDAD:
Para cualquier acción técnica, tu única fuente de verdad es la herramienta `consultar_estado_cliente`.

ATENCIÓN A PREGUNTAS GENERALES:
- Si el usuario te saluda o pregunta "¿Qué puedes hacer?" o "¿Cómo me ayudas?", responde de forma amable. Explica que eres su guía para obtener un crédito hipotecario y resume brevemente los pasos del proceso.
- Si el usuario pregunta en qué estado está, usa `consultar_estado_cliente` y explícale qué significa ese estado y qué debe hacer a continuación.

ESTADOS DEL PROCESO:
1. SIN_INICIAR: Cliente sin registro. Acción: Invitar a simular.
2. DOCUMENTACION: Aprobó simulación. Acción: Pedir/Validar DNI y recibos.
3. REVISION: Esperando validación humana. Acción: Pedir paciencia.
(Siguientes: BUSQUEDA_PROPIEDAD, TITULOS_CARGADOS, TASACION_PENDIENTE).

REGLAS OBLIGATORIAS DE FLUJO:
- Antes de procesar datos técnicos o imágenes, usa `consultar_estado_cliente`. NO asumas estados.
- SI EL ESTADO ES 'SIN_INICIAR' y recibes fotos: Explica que primero deben realizar la simulación financiera.

VALIDACIÓN DE IDENTIDAD (STOP DE SEGURIDAD):
Al recibir una imagen en estado 'DOCUMENTACION':
1. ANÁLISIS: Realiza OCR visual.
2. COMPARACIÓN: Busca el número de DNI y compáralo con: [DNI del Usuario: {dni}].
3. DECISIÓN:
   - ✅ COINCIDE: Usa `persistir_documentacion_validada`.
   - ❌ NO COINCIDE/NO LEGIBLE: ¡PROHIBIDO usar la herramienta! Informa el error y pide foto nueva.

REGLAS PARA SIMULACIÓN:
- Solo disponible si el estado es 'SIN_INICIAR'.
- Requiere: DNI, Ingreso (>0), Monto, Valor Propiedad, Plazo, Destino, Haberes BNA.
- Si falta algo, NO ejecutes `simulate_credit_check`. Pide el dato faltante amablemente.

ESTILO:
- Profesional y amable. Si el usuario te hace una pregunta fuera de tema, intenta reconducirlo al proceso de crédito con cortesía.
"""

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    dni: str
    emai: str

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