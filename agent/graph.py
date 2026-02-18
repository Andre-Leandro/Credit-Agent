from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from typing import TypedDict, List
from langchain_core.messages import BaseMessage
from .config import get_llm
from .tools import simulate_credit_check

class AgentState(TypedDict):
    messages: List[BaseMessage]


llm = get_llm().bind_tools([simulate_credit_check])

# Nodo del agente
def agent_node(state: AgentState):
    response = llm.invoke(state["messages"])
    return {"messages": state["messages"] + [response]}


# Nodo de tools
tool_node = ToolNode([simulate_credit_check])


# Router: decide si ir a tools o terminar
def should_continue(state: AgentState):
    last_message = state["messages"][-1]
    if getattr(last_message, "tool_calls", None):
        return "tools"
    return END


def build_graph():
    builder = StateGraph(AgentState)

    builder.add_node("agent", agent_node)
    builder.add_node("tools", tool_node)
    builder.set_entry_point("agent")

    builder.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            END: END,
        },
    )

    builder.add_edge("tools", "agent")

    return builder.compile()
