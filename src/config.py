import os
from langchain_aws import ChatBedrockConverse

def get_llm() -> ChatBedrockConverse:
    region = os.getenv("AWS_REGION", "us-east-1")

    return ChatBedrockConverse(
        model="anthropic.claude-3-sonnet-20240229-v1:0",  # ✅ Soporta visión (multimodal)
        region_name=region,
        temperature=0.2,
    )