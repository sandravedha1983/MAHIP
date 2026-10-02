from fastapi import APIRouter

from app.agents.orchestrator import run_case
from app.db.supabase import supabase
from app.schemas.case import OrchestratorRequest

router = APIRouter(prefix="/orchestrator", tags=["Multi-Agent Orchestrator"])


@router.post("/analyze")
def analyze(payload: OrchestratorRequest):
    created = supabase.table("cases").insert({
        "patient_id": payload.patient_id,
        "status": "processing",
    }).execute().data[0]

    return run_case(
        case_id=created["id"],
        patient_id=payload.patient_id,
        symptoms_text=payload.symptoms,
        report_id=payload.report_id,
        image_id=payload.image_id,
    )
