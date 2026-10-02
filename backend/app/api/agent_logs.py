from fastapi import APIRouter

from app.db.supabase import supabase

router = APIRouter(prefix="/agents", tags=["Agent Monitoring"])


@router.get("/logs/{case_id}")
def logs(case_id: str):
    return (
        supabase.table("agent_logs")
        .select("*")
        .eq("case_id", case_id)
        .order("created_at")
        .execute()
        .data
    )
