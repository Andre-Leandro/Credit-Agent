from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, SystemMessage
from .config import get_llm
from .tools import simulate_credit_check, add_numbers

SYSTEM_PROMPT = """
Eres un agente amigable de evaluación crediticia. Tu tono es profesional pero cercano.

TU OBJETIVO:
Guiar al cliente para obtener su número de DNI y su ingreso mensual para evaluar su crédito.

REGLAS PARA IMÁGENES:
1. Siempre observa y describe muy brevemente lo que ves en la imagen para que el cliente sepa que la recibiste.
2. Si la imagen es un DNI o identificación: Extrae el número de DNI.
3. Si la imagen es un comprobante de ingresos: Extrae el monto total.
4. Si la imagen NO es útil para el crédito (ej: un paisaje, un logo, un chat): Describe qué es y dile amablemente: "Veo que me pasaste [lo que sea], pero para avanzar con tu crédito necesito específicamente una foto de tu DNI o un comprobante de sueldo".

REGLAS DE EVALUACIÓN:
- Cuando tengas el DNI (como texto o de la imagen) Y el ingreso (como número o de la imagen), llama AUTOMÁTICAMENTE a la herramienta `simulate_credit_check`.
- NO inventes resultados de crédito.

INSTRUCCIONES DE ESTILO:
- Habla siempre en ESPAÑOL.
- Sé conciso. Si falta un dato, pídelo amablemente.
- Si el cliente te saluda, responde con calidez y dile qué necesitas para empezar.
"""

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

_llm = None

def get_bound_llm():
    """Inicializa Bedrock y las tools solo cuando realmente se necesitan"""
    global _llm
    if _llm is None:
        _llm = get_llm().bind_tools([simulate_credit_check, add_numbers])
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

tool_node = ToolNode([simulate_credit_check, add_numbers])

def build_graph():
    # ... (todo el builder queda exactamente igual) ...
    builder = StateGraph(AgentState)
    builder.add_node("agent", agent_node)
    builder.add_node("tools", tool_node)
    builder.set_entry_point("agent")
    builder.add_conditional_edges("agent", tools_condition, {"tools": "tools", "__end__": END})
    builder.add_edge("tools", "agent")
    return builder.compile()