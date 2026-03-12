import base64
import json

# --- CONFIGURACIÓN ---
RUTA_IMAGEN = "image.png"  # Poné acá el nombre de tu foto
PROMPT = "¿Qué ves en la imagen? Describila"
ARCHIVO_SALIDA = "test_payload.json"

def generar_test():
    with open(RUTA_IMAGEN, "rb") as img_file:
        b64_string = base64.b64encode(img_file.read()).decode('utf-8')
    
    payload = {
        "prompt": PROMPT,
        "image": b64_string,
        "image_type": "image/png"
    }
    
    with open(ARCHIVO_SALIDA, "w") as f:
        json.dump(payload, f)
    
    print(f"✅ Archivo {ARCHIVO_SALIDA} creado con éxito.")

if __name__ == "__main__":
    generar_test()