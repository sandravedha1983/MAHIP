import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import get_settings
from app.db.supabase import supabase
from app.services.storage import upload_file, download_file
from app.agents.image_agent import analyze_image

settings = get_settings()

router = APIRouter(
    prefix="/images",
    tags=["Medical Images"],
)


@router.post("/upload")
async def upload_image(
    patient_id: str = Form(...),
    file: UploadFile = File(...),
):
    allowed = {
        "image/png",
        "image/jpeg",
        "image/jpg",
    }

    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Only PNG/JPEG images are supported.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty.",
        )

    path = upload_file(
        settings.images_bucket,
        patient_id,
        file.filename or "xray.png",
        content,
    )

    row = {
        "patient_id": patient_id,
        "file_name": file.filename or "xray",
        "file_url": path,
        "image_type": "chest_xray",
        "analysis_status": "pending",
    }

    result = (
        supabase
        .table("medical_images")
        .insert(row)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=400,
            detail="Unable to save image.",
        )

    return result.data[0]


@router.post("/{image_id}/analyze")
async def analyze_uploaded_image(image_id: str):
    # Get image record
    result = (
        supabase
        .table("medical_images")
        .select("*")
        .eq("id", image_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Medical image not found.",
        )

    image_record = result.data
    storage_path = image_record["file_url"]

    try:
        # Download from private Supabase Storage
        image_bytes = download_file(
            settings.images_bucket,
            storage_path,
        )

        # Create temporary local file
        suffix = Path(
            image_record.get("file_name", "xray.jpg")
        ).suffix or ".jpg"

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as temp_file:
            temp_file.write(image_bytes)
            temp_path = temp_file.name

        # Update status
        supabase.table("medical_images").update({
            "analysis_status": "processing"
        }).eq("id", image_id).execute()

        # Run AI image agent
        analysis = analyze_image(temp_path)

        # Save result
        update_data = {
            "analysis_status": "completed",
            "analysis_result": analysis,
        }

        updated = (
            supabase
            .table("medical_images")
            .update(update_data)
            .eq("id", image_id)
            .execute()
        )

        Path(temp_path).unlink(missing_ok=True)

        return {
            "image_id": image_id,
            "status": "completed",
            "analysis": analysis,
            "record": updated.data[0] if updated.data else None,
        }

    except FileNotFoundError as exc:
        supabase.table("medical_images").update({
            "analysis_status": "pending"
        }).eq("id", image_id).execute()

        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )

    except Exception as exc:
        supabase.table("medical_images").update({
            "analysis_status": "failed"
        }).eq("id", image_id).execute()

        raise HTTPException(
            status_code=500,
            detail=f"Image analysis failed: {exc}",
        )