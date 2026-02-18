import os
from langchain_aws import ChatBedrockConverse


def get_llm() -> ChatBedrockConverse:
    region = os.getenv("AWS_REGION", "us-east-1")

    return ChatBedrockConverse(
        model="amazon.nova-2-lite-v1:0",
        region_name=region,
        temperature=0.2,
    )
