from fastapi import APIRouter, HTTPException

from app.db.supabase import supabase
from app.schemas.case import CaseCreate

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.post("")
def create_case(payload: CaseCreate):
    result = supabase.table("cases").insert({
        "patient_id": payload.patient_id,
        "symptoms": payload.symptoms,
        "medical_history": payload.medical_history,
    }).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Unable to create case.")
    return result.data[0]


@router.get("/{case_id}")
def get_case(case_id: str):
    return (
        supabase.table("cases")
        .select("*")
        .eq("id", case_id)
        .single()
        .execute()
    ).data
