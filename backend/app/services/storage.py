from pathlib import Path
from uuid import uuid4

from app.db.supabase import supabase


def upload_file(bucket: str, patient_id: str, filename: str, content: bytes) -> str:
    safe_name = Path(filename).name.replace(" ", "_")
    path = f"{patient_id}/{uuid4()}_{safe_name}"

    supabase.storage.from_(bucket).upload(
        path,
        content,
        {"upsert": "false"},
    )
    return path


def download_file(bucket: str, path: str) -> bytes:
    """Download a private-storage file using the server-side Supabase client."""
    return supabase.storage.from_(bucket).download(path)


def create_signed_url(bucket: str, path: str, expires_in: int = 3600) -> str:
    result = supabase.storage.from_(bucket).create_signed_url(path, expires_in)
    return result.get("signedURL") or result.get("signed_url") or ""