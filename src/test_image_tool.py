import base64
import json
from langchain_core.messages import HumanMessage
# Importamos la tool que acabamos de arreglar arriba
from tools import validar_documento_vision

def image_to_base64(path):
    try:
        with open(path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except FileNotFoundError:
        print(f"❌ Error: No encontré el archivo {path}")
        exit()

# 1. Preparar la foto
PATH_FOTO_PRUEBA = "Imagen.jpeg" 
b64_foto = image_to_base64(PATH_FOTO_PRUEBA)

# 2. Mock del estado
mock_state = {
    "messages": [
        HumanMessage(content=[
            {"type": "text", "text": "Acá va mi DNI"},
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": b64_foto
                }
            }
        ])
    ]
}

# 3. Ejecutar
print("🚀 Iniciando peritaje de visión con Claude 3.5...")

try:
    resultado = validar_documento_vision.invoke({
        "dni_esperado": "44826292", 
        "state": mock_state
    })
    print("\n--- RESULTADO DEL PERITO ---")
    print(resultado)
except Exception as e:
    print(f"\n❌ Error al invocar la Tool: {str(e)}")