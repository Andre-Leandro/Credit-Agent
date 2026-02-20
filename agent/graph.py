from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from typing import TypedDict, List
from langchain_core.messages import BaseMessage
from .config import get_llm
from .tools import simulate_credit_check
from langchain_core.messages import SystemMessage
from langchain_core.messages import BaseMessage 


SYSTEM_PROMPT = """
Eres un agente de evaluación crediticia.

TU OBJETIVO:
- Cuando el usuario proporcione DNI e ingresos mensuales,
  DEBES llamar a la herramienta `simulate_credit_check`.

REGLAS:
- Extrae DNI e income del mensaje del usuario.
- income es un número float.
- DNI es string.
- SIEMPRE usa la herramienta cuando tengas ambos datos.
- NO inventes resultados.
- NO pidas información si ya está presente.
- Responde en español.

EJEMPLOS DE USO:
Usuario: Evaluar crédito para DNI 12345678 con ingresos mensuales de 50000
Acción: simulate_credit_check(dni="12345678", income=50000)

Usuario: Quiero saber si el cliente con DNI 87654321 y un ingreso mensual de 800 puede acceder a un crédito
Acción: simulate_credit_check(dni="87654321", income=800)

Si tienes ambos datos, llama directamente a la herramienta y responde SOLO con el resultado de la herramienta.
"""


class AgentState(TypedDict):
    messages: List[BaseMessage]


llm = get_llm().bind_tools([simulate_credit_check])


# Nodo del agente
def agent_node(state: AgentState):
    messages = state["messages"]

    # 🔥 inyectar system message solo al inicio
    if not any(m.type == "system" for m in messages):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages

    response = llm.invoke(messages)

    return {"messages": state["messages"] + [response]}

# Nodo de tools
tool_node = ToolNode([simulate_credit_check])


def build_graph():
    builder = StateGraph(AgentState)

    builder.add_node("agent", agent_node)
    builder.add_node("tools", tool_node)
    builder.set_entry_point("agent")

    # ✅ routing robusto oficial
    builder.add_conditional_edges(
        "agent",
        tools_condition,
        {
            "tools": "tools",
            "__end__": END,
        },
    )

    builder.add_edge("tools", "agent")

    return builder.compile()
