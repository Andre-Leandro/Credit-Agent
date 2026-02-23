from langgraph.func import entrypoint
from langchain_core.messages import HumanMessage
from bedrock_agentcore import BedrockAgentCoreApp

from agent.graph import build_graph

app = BedrockAgentCoreApp()

# 🔥 FIX 3: Empezamos con el grafo vacío en el entorno global
graph = None 

@app.entrypoint
def handle_request(event: dict) -> dict:
    global graph
    
    # 🔥 FIX 4: Lo construimos SOLO en la primera ejecución
    if graph is None:
        print("Inicializando el grafo por primera vez...")
        graph = build_graph()

    user_message = event.get("prompt", "")

    result = graph.invoke(
        {"messages": [HumanMessage(content=user_message)]}
    )

    final_msg = result["messages"][-1]
    final_text = ""

    if isinstance(final_msg.content, list):
        final_text = " ".join([b.get("text", "") for b in final_msg.content if isinstance(b, dict) and "text" in b])
        if not final_text:
            final_text = str(final_msg.content)
    else:
        final_text = final_msg.content

    if final_text == "[]" or not final_text:
        if len(result["messages"]) >= 2 and result["messages"][-2].type == "tool":
            final_text = result["messages"][-2].content
        elif hasattr(final_msg, "tool_calls") and final_msg.tool_calls:
            final_text = f"El agente intentó usar la herramienta '{final_msg.tool_calls[0]['name']}', pero el grafo terminó antes de ejecutarla."

    return {
        "response": final_text
    }