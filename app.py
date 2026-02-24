from typing import Dict, Any, Optional
from bedrock_agentcore import BedrockAgentCoreApp
from bedrock_agentcore.runtime.context import RequestContext

app = BedrockAgentCoreApp()
graph = None

def get_graph():
    global graph
    if graph is None:
        from agent.graph import build_graph
        graph = build_graph()
    return graph

@app.entrypoint
def invoke(payload: Dict[str, Any], context: Optional[RequestContext] = None) -> Dict[str, Any]:
    # Extraemos el mensaje usando la prioridad que muestra el experto
    prompt = payload.get("prompt", payload.get("message", ""))
    
    if not prompt:
        return {"response": "No recibí ningún mensaje."}

    # Importamos acá para evitar fallos de inicialización
    from langchain_core.messages import HumanMessage
    
    agent_graph = get_graph()
    
    # Invocamos el grafo
    result = agent_graph.invoke(
        {"messages": [HumanMessage(content=prompt)]}
    )

    # Extraemos la respuesta final (con el fix de la tool que hicimos antes)
    final_msg = result["messages"][-1]
    final_text = final_msg.content if final_msg.content else ""
    
    # Si Claude se queda mudo tras la tool, sacamos el contenido del mensaje anterior
    if (not final_text or final_text == "[]") and len(result["messages"]) >= 2:
        final_text = result["messages"][-2].content

    return {"response": str(final_text)}