import os
from langchain_aws import ChatBedrockConverse

def get_llm() -> ChatBedrockConverse:
    region = os.getenv("AWS_REGION", "us-east-1")

    return ChatBedrockConverse(
        # 🔥 Bajamos a Haiku para saltar la Service Control Policy (SCP)
        model="anthropic.claude-3-haiku-20240307-v1:0",
        region_name=region,
        temperature=0.2,
    )