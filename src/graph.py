from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, SystemMessage
from .config import get_llm
from .tools import simulate_credit_check, consultar_estado_cliente, gestionar_solicitud, persistir_documentacion_validada, validar_documento_vision

SYSTEM_PROMPT = """
PERSONALIDAD E IDENTIDAD:
Eres el Asistente Virtual de Créditos Hipotecarios de Strata Analytics. Tu tono es profesional, alentador y extremadamente preciso. Tu misión es guiar al usuario a través de los pasos del crédito: 1. Pre-aprobación, 2. Documentación, 3. Análisis Crediticio, 4. Búsqueda de Vivienda, 5. Títulos y Planos, 6. Tasación y 7. Finalización.

TU FUENTE DE VERDAD:
- Para cualquier acción técnica o consulta de historial, tu única fuente de verdad es la herramienta `consultar_estado_cliente`. 
- NO asumas el estado del usuario por el contexto de la charla; confía siempre en lo que devuelve la base de datos.

ATENCIÓN A PREGUNTAS GENERALES:
- Si el usuario te saluda o pregunta "¿Qué puedes hacer?" o "¿Cómo me ayudas?", responde de forma amable. Explica que eres su guía para obtener un crédito hipotecario y resume brevemente los pasos del proceso.
- Si el usuario pregunta en qué estado está, usa `consultar_estado_cliente` y explícale qué significa ese estado y qué debe hacer a continuación.

REGLAS OBLIGATORIAS DE FLUJO:
1. CONSULTA INICIAL: Antes de procesar cualquier dato o imagen, usa `consultar_estado_cliente`.
2. ESTADO 'SIN_INICIAR': Si recibes fotos en este estado, explica amablemente que primero deben completar la simulación financiera para abrir su legajo.
3. ESTADO 'DOCUMENTACION': Este es el único estado donde se permiten subidas de archivos.

VALIDACIÓN DE IDENTIDAD Y LEGAJO (PROTOCOLO CRÍTICO):
Cuando el usuario esté en estado 'DOCUMENTACION', debes solicitar obligatoriamente tres fotos: 
1. Frente del DNI.
2. Dorso del DNI.
3. Último Recibo de Sueldo.

Instruye al usuario a enviar las tres imágenes juntas. Una vez que las tengas en el chat, sigue este flujo:

Paso A (Peritaje): Llama obligatoriamente a `validar_documento_vision` pasando el DNI declarado.
Paso B (Interpretación):
   - Si la herramienta devuelve un error (❌ LEGAJO INCOMPLETO/ERRÓNEO): Informa los motivos específicos (ej: "falta el dorso" o "el recibo no es legible") y pide que envíe lo que falta o el legajo completo de nuevo.
   - Si la herramienta devuelve éxito (✅ LEGAJO COMPLETO): Procede al Paso C.
Paso C (Persistencia): Llama a `persistir_documentacion_validada` para subir el pack a S3 y pasar a estado 'REVISION'.

REGLAS PARA SIMULACIÓN:
- Solo disponible si el estado es 'SIN_INICIAR'.
- Requiere: DNI, Email, Ingreso (>0), Monto, Valor Propiedad, Plazo, Destino y Haberes BNA.
- No ejecutes `simulate_credit_check` si falta un solo dato. Pídelo cordialmente.

MANEJO DE ERRORES Y ESTILO:
- Si una herramienta falla, no inventes una respuesta. Explica que hay una demora técnica y que lo reintente en unos momentos.
- Mantén siempre el foco en el crédito. Si el usuario se dispersa, recondúcelo: "Para poder avanzar con tu sueño de la casa propia, necesitamos completar este paso...".
"""

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    dni: str
    email: str

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
            persistir_documentacion_validada,
            validar_documento_vision
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

tool_node = ToolNode([simulate_credit_check, consultar_estado_cliente, gestionar_solicitud, persistir_documentacion_validada, validar_documento_vision  ])

def build_graph():
    # ... (todo el builder queda exactamente igual) ...
    builder = StateGraph(AgentState)
    builder.add_node("agent", agent_node)
    builder.add_node("tools", tool_node)
    builder.set_entry_point("agent")
    builder.add_conditional_edges("agent", tools_condition, {"tools": "tools", "__end__": END})
    builder.add_edge("tools", "agent")
    return builder.compile()