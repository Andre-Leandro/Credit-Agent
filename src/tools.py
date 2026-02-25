from langchain.tools import tool
from pydantic import BaseModel, Field


class CreditCheckInput(BaseModel):
    """Input para evaluación crediticia."""
    dni: str = Field(description="DNI del cliente")
    income: float = Field(description="Ingreso mensual del cliente")


class SumInput(BaseModel):
    """Input para suma de dos números."""
    a: int = Field(description="Primer número")
    b: int = Field(description="Segundo número")

@tool(args_schema=CreditCheckInput)
def simulate_credit_check(dni: str, income: float) -> str:
    """
    Evalúa la elegibilidad crediticia de un cliente.

    Usa esta herramienta cuando el usuario proporcione DNI e ingreso mensual.
    """

    income = float(income)

    if income > 1000:
        return f"Cliente {dni} preaprobado para crédito."
    return f"Cliente {dni} requiere evaluación manual."

@tool(args_schema=SumInput)
def add_numbers(a: int, b: int) -> int:
    """Return the sum of two numbers"""
    return a+b
