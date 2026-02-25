from langchain.tools import tool

@tool
def simulate_credit_check(dni: str, income: float) -> str:
    """
    Evalúa la elegibilidad crediticia de un cliente.

    Usa esta herramienta cuando el usuario proporcione DNI e ingreso mensual.
    """

    income = float(income)

    if income > 1000:
        return f"Cliente {dni} preaprobado para crédito."
    return f"Cliente {dni} requiere evaluación manual."

@tool
def add_numbers(a: int, b: int) -> int:
    """Return the sum of two numbers"""
    return a+b
