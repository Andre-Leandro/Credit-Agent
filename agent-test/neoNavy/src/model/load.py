from langchain_aws import ChatBedrock

# Uses global inference profile for Claude Sonnet 4.5
# https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html
MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"

def load_model() -> ChatBedrock:
    """
    Get Bedrock model client.
    Uses IAM authentication via the execution role.
    """
    return ChatBedrock(model_id=MODEL_ID)