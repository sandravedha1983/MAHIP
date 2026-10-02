import json
import re
from typing import Any

from app.core.config import get_settings


class LLMService:
    """
    Provider abstraction.

    `mock` is deterministic and lets the project run before an external LLM
    key is configured. `openai` uses the official OpenAI Python SDK.
    """

    def __init__(self):
        self.settings = get_settings()

    def generate_text(self, system: str, user: str) -> str:
        if self.settings.llm_provider.lower() == "openai":
            if not self.settings.openai_api_key or not self.settings.openai_model:
                raise RuntimeError("OPENAI_API_KEY and OPENAI_MODEL are required.")
            from openai import OpenAI
            client = OpenAI(api_key=self.settings.openai_api_key)
            response = client.responses.create(
                model=self.settings.openai_model,
                instructions=system,
                input=user,
            )
            return response.output_text

        return (
            "Development-mode response. Configure LLM_PROVIDER=openai and "
            "OPENAI_API_KEY/OPENAI_MODEL for model-generated text."
        )

    def generate_json(self, system: str, user: str, fallback: dict[str, Any]) -> dict[str, Any]:
        if self.settings.llm_provider.lower() != "openai":
            return fallback

        text = self.generate_text(system, user)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, flags=re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    pass
        return fallback
