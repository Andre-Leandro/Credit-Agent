from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from typing import TypedDict, List, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, SystemMessage
from .config import get_llm
from .tools import simulate_credit_check

SYSTEM_PROMPT = """... (tu prompt igual que antes) ..."""

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

# 🔥 FIX 1: Quitamos el LLM global y usamos una variable privada
_llm = None

def get_bound_llm():
    """Inicializa Bedrock y las tools solo cuando realmente se necesitan"""
    global _llm
    if _llm is None:
        _llm = get_llm().bind_tools([simulate_credit_check])
    return _llm

# Nodo del agente
def agent_node(state: AgentState):
    messages = state["messages"]

    if not any(m.type == "system" for m in messages):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages

    # 🔥 FIX 2: Llamamos a la función perezosa
    llm = get_bound_llm()
    response = llm.invoke(messages)

    return {"messages": [response]}

tool_node = ToolNode([simulate_credit_check])

def build_graph():
    # ... (todo el builder queda exactamente igual) ...
    builder = StateGraph(AgentState)
    builder.add_node("agent", agent_node)
    builder.add_node("tools", tool_node)
    builder.set_entry_point("agent")
    builder.add_conditional_edges("agent", tools_condition, {"tools": "tools", "__end__": END})
    builder.add_edge("tools", "agent")
    return builder.compile()