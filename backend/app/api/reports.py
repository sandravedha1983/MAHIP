from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import get_settings
from app.db.supabase import supabase
from app.services.report_service import extract_pdf_text
from app.agents.report_agent import analyze_report
from app.services.storage import upload_file

settings = get_settings()

router = APIRouter(
    prefix="/reports",
    tags=["Medical Reports"],
)


@router.post("/upload")
async def upload_report(
    patient_id: str = Form(...),
    file: UploadFile = File(...),
):
    allowed_types = {
        "application/pdf",
        "text/plain",
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only PDF or TXT medical reports are supported.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded report is empty.",
        )

    filename = file.filename or "medical_report.pdf"

    path = upload_file(
        settings.reports_bucket,
        patient_id,
        filename,
        content,
    )

    extracted = ""

    if filename.lower().endswith(".pdf"):
        try:
            extracted = extract_pdf_text(content)
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Unable to extract PDF text: {exc}",
            )

    elif filename.lower().endswith(".txt"):
        extracted = content.decode(
            "utf-8",
            errors="ignore",
        ).strip()

    row = {
        "patient_id": patient_id,
        "file_name": filename,
        "file_url": path,
        "file_type": file.content_type,
        "extracted_text": extracted,
        "analysis_status": "pending",
    }

    result = (
        supabase
        .table("medical_reports")
        .insert(row)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=400,
            detail="Unable to save report.",
        )

    return result.data[0]


@router.post("/{report_id}/analyze")
def analyze_report_endpoint(report_id: str):

    result = (
        supabase
        .table("medical_reports")
        .select("*")
        .eq("id", report_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Medical report not found.",
        )

    row = result.data
    extracted_text = row.get("extracted_text", "")

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No extractable text found in this report.",
        )

    # Mark as processing
    supabase.table("medical_reports").update({
        "analysis_status": "processing"
    }).eq("id", report_id).execute()

    try:
        # Run the Medical Report Agent
        analysis = analyze_report(extracted_text)

        # Save the structured analysis
        updated = (
            supabase
            .table("medical_reports")
            .update({
                "analysis_status": "completed",
                "analysis_result": analysis,
            })
            .eq("id", report_id)
            .execute()
        )

        return {
            "report_id": report_id,
            "status": "completed",
            "analysis": analysis,
            "record": updated.data[0] if updated.data else None,
        }

    except Exception as exc:

        supabase.table("medical_reports").update({
            "analysis_status": "failed"
        }).eq("id", report_id).execute()

        raise HTTPException(
            status_code=500,
            detail=f"Report analysis failed: {exc}",
        )