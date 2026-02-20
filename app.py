from langgraph.func import entrypoint
from langchain_core.messages import HumanMessage
from bedrock_agentcore import BedrockAgentCoreApp

from agent.graph import build_graph

graph = build_graph()
app = BedrockAgentCoreApp()

@app.entrypoint
def handle_request(event: dict) -> dict:
    # Ya sabemos con seguridad que el input viene en 'prompt'
    user_message = event.get("prompt", "")

    result = graph.invoke(
        {"messages": [HumanMessage(content=user_message)]}
    )

    # 🔥 SUPER DEBUG: Imprimimos el recorrido completo de LangGraph
    print("\n=== HISTORIAL DE MENSAJES ===")
    for msg in result["messages"]:
        print(f"[{type(msg).__name__}]")
        print(f" - Content: {msg.content}")
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            print(f" - Tool Calls: {msg.tool_calls}")
    print("=============================\n")

    final_msg = result["messages"][-1]
    final_text = ""

    # Manejo seguro por si Bedrock devuelve una lista de bloques en vez de un string
    if isinstance(final_msg.content, list):
        # Intentamos extraer el texto si viene en formato [{'text': 'hola...'}]
        final_text = " ".join([b.get("text", "") for b in final_msg.content if isinstance(b, dict) and "text" in b])
        # Si sigue vacío, lo convertimos a string tal cual para no perderlo
        if not final_text:
            final_text = str(final_msg.content)
    else:
        final_text = final_msg.content

    # Chequeo por si el grafo cortó abruptamente en el intento de llamar a la tool
    if final_text == "[]" or not final_text:
        if hasattr(final_msg, "tool_calls") and final_msg.tool_calls:
            final_text = f"El agente intentó usar la herramienta '{final_msg.tool_calls[0]['name']}', pero el grafo terminó antes de ejecutarla."

    return {
        "response": final_text
    }