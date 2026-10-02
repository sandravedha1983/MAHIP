import re
from app.services.llm import LLMService

llm = LLMService()


def extract_symptoms(text: str) -> dict:
    lowered = text.lower()
    known = [
        "fever", "cough", "chest pain", "chest discomfort",
        "shortness of breath", "breathing difficulty", "headache",
        "fatigue", "vomiting", "nausea", "diarrhea", "dizziness",
        "sore throat", "abdominal pain"
    ]
    symptoms = [s for s in known if s in lowered]
    duration = None
    match = re.search(r"(\d+)\s*(day|days|week|weeks|month|months)", lowered)
    if match:
        duration = f"{match.group(1)} {match.group(2)}"

    fallback = {
        "symptoms": symptoms,
        "duration": duration,
        "follow_up_questions": [],
        "urgency_indicators": [],
    }

    if "breathing difficulty" in symptoms or "shortness of breath" in symptoms:
        fallback["follow_up_questions"].append("Please clarify the severity and onset of breathing difficulty.")

    return llm.generate_json(
        "Extract symptoms into JSON. Do not diagnose. Return symptoms, duration, follow_up_questions, urgency_indicators.",
        text,
        fallback,
    )
