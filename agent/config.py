import os
import json
import boto3
from langchain_aws import ChatBedrockConverse


# ---------- Secrets ----------

def _get_secret(secret_name: str) -> dict:
    session = boto3.session.Session()
    client = session.client("secretsmanager")

    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response["SecretString"])


def load_settings() -> dict:
    secret_name = os.getenv("APP_SECRET_NAME")

    if not secret_name:
        raise ValueError("APP_SECRET_NAME env var is required")

    return _get_secret(secret_name)


# ---------- Bedrock LLM ----------

def get_llm() -> ChatBedrockConverse:
    cfg = load_settings()

    return ChatBedrockConverse(
        model="amazon.nova-lite-v1:0",  # ← cambiable
        region_name=cfg["BEDROCK_REGION"],
        temperature=0.2,
    )
