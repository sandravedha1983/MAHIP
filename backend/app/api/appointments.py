import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import CurrentUser, get_current_user, require_patient_access, require_role
from app.db.supabase import supabase
from app.schemas.appointment import AppointmentCreate

router = APIRouter(prefix="/appointments", tags=["Appointments"])
logger = logging.getLogger(__name__)


@router.post("")
def create_appointment(payload: AppointmentCreate, user: CurrentUser = Depends(get_current_user)):
    require_role(user, "patient")
    require_patient_access(user, payload.patient_id)

    try:
        doctor = (
            supabase.table("doctors")
            .select("id,profile_id,is_available")
            .eq("id", str(payload.doctor_id))
            .maybe_single()
            .execute()
            .data
        )
    except Exception as exc:
        logger.exception("Unable to validate appointment doctor")
        raise HTTPException(status_code=500, detail="Unable to validate the selected doctor.") from exc

    if not doctor:
        raise HTTPException(status_code=404, detail="Selected doctor was not found.")
    if doctor["profile_id"] == str(user.profile_id):
        raise HTTPException(status_code=422, detail="You cannot book an appointment with yourself.")
    if not doctor["is_available"]:
        raise HTTPException(status_code=422, detail="Selected doctor is not currently available.")

    try:
        result = supabase.table("appointments").insert(payload.model_dump(mode="json")).execute()
    except Exception as exc:
        logger.exception("Unable to create appointment")
        raise HTTPException(status_code=500, detail="Unable to create appointment.") from exc
    if not result.data:
        raise HTTPException(status_code=400, detail="Unable to create appointment.")
    return result.data[0]


@router.get("/patient/{patient_id}")
def patient_appointments(patient_id: str, user: CurrentUser = Depends(get_current_user)):
    require_patient_access(user, patient_id)
    return (
        supabase.table("appointments")
        .select("*")
        .eq("patient_id", patient_id)
        .order("appointment_date")
        .execute()
        .data
    )
