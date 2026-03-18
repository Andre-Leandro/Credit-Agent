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
    image_type = payload.get("image_type", "image/png")
    
    # --- 1. CAPTURAR DATOS DEL PAYLOAD ---
    dni = payload.get("dni") 
    email = payload.get("email")
    
    # --- LIMPIEZA DE BASE64 ---
    cleaned_b64 = None
    if image_b64:
        if "," in image_b64:
            cleaned_b64 = image_b64.split(",")[1]
        else:
            cleaned_b64 = image_b64
        cleaned_b64 = cleaned_b64.strip().replace("\n", "").replace("\r", "")

    # --- 2. CONSTRUIR EL "SOPLO" PARA EL AGENTE ---
    # Creamos un encabezado que contenga ambos datos si existen
    header = ""
    if dni: header += f"[DNI: {dni}] "
    if email: header += f"[Email: {email}] "
    
    # El texto final que leerá el Agente
    prompt_con_contexto = f"{header}{prompt}"

    agent_graph = await get_graph()

    # --- 3. CONSTRUIR CONTENIDO MULTIMODAL ---
    if cleaned_b64:
        content = [
            {
                "type": "text", 
                "text": prompt_con_contexto # <--- Inyectamos DNI y Email acá
            },
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": image_type,
                    "data": cleaned_b64
                }
            }
        ]
    else:
        # Si no hay imagen, mandamos el texto con el encabezado
        content = prompt_con_contexto

    # --- 4. INVOCAR EL GRAFO CON EL ESTADO COMPLETO ---
    result = await agent_graph.ainvoke(
        {
            "messages": [HumanMessage(content=content)], 
            "dni": dni, 
            "email": email # <--- Asegurate que en graph.py diga 'email' y no 'emai'
        }
    )

    final_msg = result["messages"][-1]
    final_text = final_msg.content if final_msg.content else ""
    
    if (not final_text or final_text == "[]") and len(result["messages"]) >= 2:
        final_text = result["messages"][-2].content

    return {"result": str(final_text)}

if __name__ == "__main__":
    app.run()