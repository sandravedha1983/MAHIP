import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.db.supabase import supabase
from app.core.security import CurrentUser, get_current_user, require_patient_access, require_role
from app.schemas.patient import PatientCreate, PatientResponse

router = APIRouter(prefix="/patients", tags=["Patients"])
logger = logging.getLogger(__name__)


@router.post("", response_model=PatientResponse)
def create_patient(payload: PatientCreate, user: CurrentUser = Depends(get_current_user)):
    require_role(user, "patient")
    if payload.profile_id != user.profile_id:
        raise HTTPException(status_code=403, detail="Patient records can only be created for your own profile.")

    try:
        result = (
            supabase.table("patients")
            .upsert(
                payload.model_dump(mode="json", exclude_none=True),
                on_conflict="profile_id",
            )
            .execute()
        )
    except Exception as exc:
        logger.exception("Unable to save patient profile")
        raise HTTPException(status_code=500, detail="Unable to save patient profile.") from exc

    if not result.data:
        raise HTTPException(status_code=400, detail="Unable to save patient profile.")
    return result.data[0]


@router.get("/me", response_model=PatientResponse)
def get_my_patient(user: CurrentUser = Depends(get_current_user)):
    require_role(user, "patient")
    result = (
        supabase.table("patients")
        .select("*")
        .eq("profile_id", str(user.profile_id))
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Patient record has not been created.")
    return result.data


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: UUID, user: CurrentUser = Depends(get_current_user)):
    require_patient_access(user, patient_id)
    result = (
        supabase.table("patients")
        .select("*")
        .eq("id", str(patient_id))
        .single()
        .execute()
    )
    return result.data
