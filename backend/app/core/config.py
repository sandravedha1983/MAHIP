from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MAHIP Backend"
    app_version: str = "1.0.0"
    debug: bool = True

    supabase_url: str
    supabase_publishable_key: str
    supabase_server_key: str

    llm_provider: str = "mock"
    openai_api_key: str | None = None
    openai_model: str | None = None

    reports_bucket: str = "medical-reports"
    images_bucket: str = "medical-images"

    xray_model_path: str = "../models/checkpoints/xray_model.pt"
    xray_classes_path: str = "../models/checkpoints/classes.json"
    rag_index_path: str = "../data/knowledge/index.json"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
