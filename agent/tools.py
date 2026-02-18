from langchain.tools import tool


@tool
def simulate_credit_check(dni: str, income: float) -> str:
    """Evalúa elegibilidad crediticia básica (mock)."""

    if income > 1000:
        return f"Cliente {dni} preaprobado para crédito."
    return f"Cliente {dni} requiere evaluación manual."
