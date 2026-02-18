from fastapi import FastAPI
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from agent.graph import build_graph

app = FastAPI()
graph = build_graph()


class Query(BaseModel):
    message: str


@app.post("/ask")
async def ask(q: Query):
    result = graph.invoke(
        {"messages": [HumanMessage(content=q.message)]}
    )

    return {"response": result["messages"][-1].content}
