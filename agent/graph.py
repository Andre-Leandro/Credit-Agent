from langgraph.graph import StateGraph, END
from typing import TypedDict, List
from langchain_core.messages import BaseMessage, HumanMessage

from .bedrock import get_llm
from .tools import simulate_credit_check


class AgentState(TypedDict):
    messages: List[BaseMessage]


llm = get_llm()


def agent_node(state: AgentState):
    response = llm.invoke(state["messages"])
    return {"messages": state["messages"] + [response]}


def build_graph():
    builder = StateGraph(AgentState)

    builder.add_node("agent", agent_node)

    builder.set_entry_point("agent")
    builder.add_edge("agent", END)

    return builder.compile()
