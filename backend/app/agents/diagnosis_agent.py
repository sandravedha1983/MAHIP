from app.services.llm import LLMService

llm = LLMService()


def generate_support_summary(
    symptoms: dict,
    report: dict | None,
    image: dict | None,
    knowledge: dict,
) -> dict:
    fallback = {
        "possible_conditions": [],
        "supporting_evidence": [],
        "uncertainties": [
            "This prototype does not establish a diagnosis.",
            "Clinical examination and professional interpretation may be required.",
        ],
        "risk_indicators": symptoms.get("urgency_indicators", []),
        "recommended_next_steps": [
            "Review the available evidence with a qualified healthcare professional."
        ],
        "clinical_summary": "AI-generated clinical-support summary; not a definitive diagnosis.",
    }

    prompt = {
        "symptoms": symptoms,
        "report": report,
        "image": image,
        "knowledge": knowledge,
    }

    return llm.generate_json(
        "You are a clinical decision-support assistant. "
        "Summarize evidence conservatively, preserve uncertainty, do not diagnose, "
        "and never invent patient facts. Return the requested JSON fields.",
        str(prompt),
        fallback,
    )
