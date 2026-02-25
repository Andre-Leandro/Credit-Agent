# Especificamos la plataforma para que no haya dudas
FROM --platform=linux/arm64 public.ecr.aws/docker/library/python:3.12-slim

# Evita que Python genere archivos .pyc y fuerza logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalamos curl por si necesitamos diagnosticar
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

# Usamos la bandera -u para asegurar logs inmediatos
CMD ["python", "-u", "app.py"]