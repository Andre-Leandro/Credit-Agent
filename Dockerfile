FROM public.ecr.aws/docker/library/python:3.12-slim

# Instalamos dependencias del sistema si fueran necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiamos los requerimientos e instalamos
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del código
COPY . .

# Exponemos el puerto que usa AgentCore
EXPOSE 8080

# Comando para arrancar la app
CMD ["python", "app.py"]