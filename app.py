from typing import Dict, Any, Optional
from bedrock_agentcore import BedrockAgentCoreApp
from bedrock_agentcore.runtime.context import RequestContext


print(">>> INICIANDO AGENTE ULTIMATE")

app = BedrockAgentCoreApp()
graph = None


async def get_graph(): # 🔥 Ahora es async
    global graph
    if graph is None:
        from src.graph import build_graph
        graph = build_graph()
    return graph 

@app.entrypoint
async def invoke(payload: Dict[str, Any], context: Optional[RequestContext] = None) -> Dict[str, Any]:
    prompt = payload.get("prompt", payload.get("message", ""))
    
    if not prompt:
        return {"result": "No recibí ningún mensaje."}

    from langchain_core.messages import HumanMessage
    agent_graph = await get_graph() # 🔥 Await
    
    # 🔥 Usamos ainvoke (versión asincrónica del grafo)
    result = await agent_graph.ainvoke(
        {"messages": [HumanMessage(content=prompt)]}
    )

    final_msg = result["messages"][-1]
    final_text = final_msg.content if final_msg.content else ""
    
    if (not final_text or final_text == "[]") and len(result["messages"]) >= 2:
        final_text = result["messages"][-2].content

    # 🔥 Cambiamos 'response' por 'result' para coincidir con el estándar
    return {"result": str(final_text)}

if __name__ == "__main__":
    app.run()