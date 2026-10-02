from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agents.rag_agent import retrieve_medical_knowledge


router = APIRouter(
    prefix="/rag",
    tags=["Medical Knowledge RAG"],
)


class RAGRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=3,
        description="Medical knowledge query",
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=10,
    )


@router.post("/search")
def search_knowledge(request: RAGRequest):

    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty.",
        )

    return retrieve_medical_knowledge(
        request.query,
        request.top_k,
    )