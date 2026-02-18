from langgraph.func import entrypoint
from langchain_core.messages import HumanMessage
from bedrock_agentcore import BedrockAgentCoreApp

from agent.graph import build_graph

graph = build_graph()

app = BedrockAgentCoreApp()


@app.entrypoint
def handle_request(event: dict) -> dict:
    """
    Entry point requerido por AgentCore.
    Recibe un dict y devuelve un dict.
    """

    user_message = event.get("message", "")

    result = graph.invoke(
        {"messages": [HumanMessage(content=user_message)]}
    )

    return {
        "response": result["messages"][-1].content
    }
