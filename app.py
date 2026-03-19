from typing import Dict, Any, Optional, List
from bedrock_agentcore import BedrockAgentCoreApp
from bedrock_agentcore.runtime.context import RequestContext
from langchain_core.messages import HumanMessage
import base64

print(">>> INICIANDO AGENTE ULTIMATE - MODO COMBO")

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
    # 1. CAPTURAR DATOS BÁSICOS
    prompt = payload.get("prompt", payload.get("message", ""))
    dni = payload.get("dni") 
    email = payload.get("email")
    image_type = payload.get("image_type", "image/png")
    
    # Capturamos imágenes (puede venir como 'image' o como lista en 'images')
    raw_images = payload.get("images", payload.get("image", []))
    
    # Normalizamos a lista si es un solo string
    if isinstance(raw_images, str):
        raw_images = [raw_images]

    # 2. LIMPIEZA Y PROCESAMIENTO DE IMÁGENES
    cleaned_images = []
    for img in raw_images:
        if img:
            # Quitamos el prefijo data:image/... si existe
            clean = img.split(",")[1] if "," in img else img
            # Limpieza de caracteres de escape
            clean = clean.strip().replace("\n", "").replace("\r", "")
            cleaned_images.append(clean)

    # 3. CONSTRUIR EL "SOPLO" DE CONTEXTO (DNI + Email)
    header = ""
    if dni: header += f"[DNI: {dni}] "
    if email: header += f"[Email: {email}] "
    
    prompt_con_contexto = f"{header}{prompt}"

    # 4. CONSTRUIR CONTENIDO MULTIMODAL PARA LANGCHAIN
    # Empezamos con el bloque de texto
    content = [{"type": "text", "text": prompt_con_contexto}]
    
    # Agregamos cada imagen procesada como un bloque individual
    for img_b64 in cleaned_images:
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": image_type,
                "data": img_b64
            }
        })

    # 5. INVOCAR EL GRAFO
    agent_graph = await get_graph()
    
    # Le pasamos el DNI y el Email al estado para que las Tools lo tengan a mano
    result = await agent_graph.ainvoke(
        {
            "messages": [HumanMessage(content=content)], 
            "dni": str(dni) if dni else "", 
            "email": str(email) if email else ""
        }
    )

    # 6. MANEJO DE RESPUESTA FINAL
    final_msg = result["messages"][-1]
    final_text = final_msg.content if final_msg.content else ""
    
    # Backup por si el último mensaje quedó vacío (raro, pero pasa en streams)
    if (not final_text or final_text == "[]") and len(result["messages"]) >= 2:
        final_text = result["messages"][-2].content

    return {"result": str(final_text)}

if __name__ == "__main__":
    app.run()