import logging

from fastapi import APIRouter, HTTPException

from app.db.supabase import supabase

router = APIRouter(prefix="/doctors", tags=["Doctors"])
logger = logging.getLogger(__name__)


@router.get("")
def list_doctors(specialization: str | None = None):
    try:
        query = supabase.table("doctors").select(
            "id,profile_id,specialization,qualification,experience_years,"
            "consultation_fee,bio,is_available,profiles(full_name,email)"
        )
        if specialization:
            query = query.ilike("specialization", f"%{specialization}%")
        result = query.execute()
    except Exception as exc:
        logger.exception("Unable to retrieve doctor directory")
        raise HTTPException(status_code=500, detail="Unable to load doctors.") from exc

    return [
        {
            "id": doctor["id"],
            "profile_id": doctor["profile_id"],
            "name": (doctor.get("profiles") or {}).get("full_name"),
            "email": (doctor.get("profiles") or {}).get("email"),
            "specialization": doctor["specialization"],
            "qualification": doctor.get("qualification"),
            "experience_years": doctor.get("experience_years"),
            "consultation_fee": doctor.get("consultation_fee"),
            "bio": doctor.get("bio"),
            "is_available": doctor["is_available"],
        }
        for doctor in (result.data or [])
    ]
