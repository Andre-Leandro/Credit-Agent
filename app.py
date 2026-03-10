from typing import Dict, Any, Optional
from bedrock_agentcore import BedrockAgentCoreApp
from bedrock_agentcore.runtime.context import RequestContext
from langchain_core.messages import HumanMessage
import base64

print(">>> INICIANDO AGENTE ULTIMATE")

app = BedrockAgentCoreApp()
graph = None

async def get_graph(): 
    global graph
    if graph is None:
        from src.graph import build_graph
        graph = build_graph()
    return graph 

@app.entrypoint
async def invoke(payload: Dict[str, Any], context: Optional[RequestContext] = None) -> Dict[str, Any]:
    prompt = payload.get("prompt", payload.get("message", ""))
    image_b64 = payload.get("image")
    image_type = payload.get("image_type", "image/png") # Aseguramos un default
    
    # --- LIMPIEZA DE BASE64 (Vital para Bedrock) ---
    cleaned_b64 = None
    if image_b64:
        # Quitamos el prefijo 'data:image/png;base64,' si existe
        if "," in image_b64:
            cleaned_b64 = image_b64.split(",")[1]
        else:
            cleaned_b64 = image_b64
        
        # Quitamos saltos de línea y espacios
        cleaned_b64 = cleaned_b64.strip().replace("\n", "").replace("\r", "")

    agent_graph = await get_graph()

    # --- CONSTRUIR CONTENIDO MULTIMODAL NATIVO ---
    if cleaned_b64:
        content = [
            {
                "type": "text", 
                "text": prompt if prompt else "Analiza esta imagen."
            },
            {
                "type": "image", # <--- Formato nativo Bedrock
                "source": {
                    "type": "base64",
                    "media_type": image_type,
                    "data": cleaned_b64 # Base64 PURO
                }
            }
        ]
        print(f"📸 Enviando bloque de IMAGEN nativo. Tamaño: {len(cleaned_b64)}")
    else:
        content = prompt
        print(f"📝 Enviando solo TEXTO")

    # Invocamos el grafo
    result = await agent_graph.ainvoke(
        {"messages": [HumanMessage(content=content)]}
    )

    final_msg = result["messages"][-1]
    final_text = final_msg.content if final_msg.content else ""
    
    if (not final_text or final_text == "[]") and len(result["messages"]) >= 2:
        final_text = result["messages"][-2].content

    return {"result": str(final_text)}

if __name__ == "__main__":
    app.run()