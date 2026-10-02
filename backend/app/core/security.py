import logging
from dataclasses import dataclass
from uuid import UUID

from fastapi import Header, HTTPException

from app.db.supabase import supabase

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CurrentUser:
    profile_id: UUID
    role: str


def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication is required.")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authentication is required.")

    try:
        auth_response = supabase.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired access token.") from exc

    user = getattr(auth_response, "user", None)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired access token.")

    try:
        profile_id = UUID(str(user.id))
        result = (
            supabase.table("profiles")
            .select("id,role")
            .eq("id", str(profile_id))
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.exception("Unable to resolve authenticated profile")
        raise HTTPException(status_code=500, detail="Unable to resolve authenticated profile.") from exc

    if not result.data:
        raise HTTPException(status_code=403, detail="An active MAHIP profile is required.")

    role = result.data.get("role")
    if role not in {"patient", "doctor", "admin"}:
        raise HTTPException(status_code=403, detail="The profile does not have an allowed role.")

    return CurrentUser(profile_id=profile_id, role=role)


def require_role(user: CurrentUser, *roles: str) -> None:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="You are not authorized to perform this action.")


def require_patient_access(user: CurrentUser, patient_id: UUID) -> dict:
    try:
        patient = (
            supabase.table("patients")
            .select("id,profile_id")
            .eq("id", str(patient_id))
            .maybe_single()
            .execute()
            .data
        )
    except Exception as exc:
        logger.exception("Unable to validate patient access")
        raise HTTPException(status_code=500, detail="Unable to validate patient access.") from exc

    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    if user.role == "admin" or (user.role == "patient" and patient["profile_id"] == str(user.profile_id)):
        return patient

    if user.role == "doctor":
        try:
            doctor = (
                supabase.table("doctors")
                .select("id")
                .eq("profile_id", str(user.profile_id))
                .maybe_single()
                .execute()
                .data
            )
            if doctor:
                appointments = (
                    supabase.table("appointments")
                    .select("id")
                    .eq("patient_id", str(patient_id))
                    .eq("doctor_id", doctor["id"])
                    .limit(1)
                    .execute()
                    .data
                )
                cases = (
                    supabase.table("cases")
                    .select("id")
                    .eq("patient_id", str(patient_id))
                    .limit(1)
                    .execute()
                    .data
                )
                if appointments or cases:
                    return patient
        except Exception as exc:
            logger.exception("Unable to validate doctor patient assignment")
            raise HTTPException(status_code=500, detail="Unable to validate patient access.") from exc

    raise HTTPException(status_code=403, detail="You are not authorized to access this patient.")