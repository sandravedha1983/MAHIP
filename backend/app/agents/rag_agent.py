from app.rag.retriever import retriever


def retrieve_knowledge(
    query: str,
    top_k: int = 5,
) -> dict:
    """
    Retrieve relevant medical knowledge for the multi-agent
    healthcare workflow.
    """

    results = retriever.search(
        query,
        k=top_k,
    )

    sources = []

    for result in results:
        sources.append({
            "source": result.get("source"),
            "chunk": result.get("chunk"),
            "score": result.get("score"),
        })

    return {
        "query": query,
        "result_count": len(results),
        "knowledge": results,
        "sources": sources,
        "clinical_note": (
            "Retrieved information is intended for research and "
            "decision-support purposes. It is not a medical diagnosis "
            "and should be reviewed by a qualified healthcare professional."
        ),
    }


# Compatibility alias for direct RAG API usage
def retrieve_medical_knowledge(
    query: str,
    top_k: int = 5,
) -> dict:
    return retrieve_knowledge(
        query=query,
        top_k=top_k,
    )