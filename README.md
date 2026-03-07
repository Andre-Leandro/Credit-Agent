# Credit-Agent (Strata)

---

# Contenido

- [Características](#-caracter%C3%ADsticas)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalaci%C3%B3n)
- [Uso](#-uso)
- [Desarrollo](#-desarrollo)
- [Pruebas](#-pruebas)
- [Licencia](#-licencia)

## Características

- Backend en Python con herramientas para carga de modelos, gestión de agentes y utilidades.
- Frontend en React + TypeScript usando Vite para una interfaz de simulación y chat.
- Estructura modular para permitir integración de modelos de IA (ej. `agent-test/neoNavy`).
- Soporte para tests unitarios en Python (`agent-test/neoNavy/test`) y configuración de frontend estable.

## Arquitectura

El proyecto está organizado en varias carpetas clave:

- `app.py`: punto de entrada principal para el servicio Python.
- `src/`: código fuente de backend con `config.py`, `graph.py`, `tools.py`.
- `agent-test/`: contiene paquetes de ejemplo o pruebas de integración con agentes (ej. `neoNavy`).
- `frontend/`: aplicación de cliente construida con React y Vite.

El backend y el frontend se ejecutan de forma independiente, comunicándose a través de una API HTTP o sockets si se configura.

## Instalación

### Requisitos previos

- Python 3.11+ (se recomienda usar un entorno virtual)
- Node.js 18+ y npm/yarn
- Docker (opcional, hay `Dockerfile` para empaquetado)

### Backend

```bash
cd /Users/andreleandro/Documents/Credit-Agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # si existe
# o utilizar pyproject.toml si usa Poetry/Flit
pip install .
```

### Frontend

```bash
cd frontend
npm install   # o yarn
npm run dev   # iniciar servidor de desarrollo
```

### Docker (opcional)

```bash
docker build -t credit-agent .
docker run -p 8000:8000 credit-agent
```

## Uso

1. Levanta el backend (`python app.py` o ejecuta el módulo principal). Debe escuchar en `localhost:8000` por defecto.
2. Inicia el frontend (`npm run dev` en `frontend/`). Visita `http://localhost:3000` (u otro puerto mostrado) para interactuar.
3. Modifica `src/` para ampliar funcionalidades del agente y `frontend/src` para cambiar la interfaz.

> 🔧 La comunicación con el agente puede configurarse en `config.py` o mediante variables de entorno.

## Desarrollo

- El código Python sigue las buenas prácticas de PEP 8. Usa `black`, `flake8` o similar para formatear.
- Los tests en `agent-test/neoNavy/test` se ejecutan con `pytest`.

```bash
cd agent-test/neoNavy
env/bin/activate  # si se usa un entorno separado
pytest
```

- Para el frontend, usa las herramientas de React, ESLint y Prettier ya configuradas.

## Pruebas

- Backend: `pytest` cubre módulos en `src/`.
- Frontend: corre `npm run test` dentro de la carpeta `frontend` (si está configurado con una librería de testing).

## Licencia

Este proyecto está licenciado bajo la [MIT License](LICENSE) o la que se defina.
