import time
from pathlib import Path
from tempfile import NamedTemporaryFile

from app.agents.diagnosis_agent import generate_support_summary
from app.agents.image_agent import analyze_image
from app.agents.patient_agent import extract_symptoms
from app.agents.rag_agent import retrieve_knowledge
from app.agents.report_agent import analyze_report
from app.db.supabase import supabase
from app.services.storage import download_file


def _log(
    case_id: str,
    agent_name: str,
    started: float,
    output: dict,
    status="success",
):
    supabase.table("agent_logs").insert({
        "case_id": case_id,
        "agent_name": agent_name,
        "agent_type": "specialized",
        "output_data": output,
        "status": status,
        "execution_time_ms": int(
            (time.perf_counter() - started) * 1000
        ),
    }).execute()


def run_case(
    case_id: str,
    patient_id: str,
    symptoms_text: str,
    report_id: str | None,
    image_id: str | None,
):

    # ---------------------------------------------------------
    # 1. Patient Interaction Agent
    # ---------------------------------------------------------
    started = time.perf_counter()

    symptoms = extract_symptoms(
        symptoms_text
    )

    _log(
        case_id,
        "patient_agent",
        started,
        symptoms,
    )

    # ---------------------------------------------------------
    # 2. Medical Report Agent
    # ---------------------------------------------------------
    report_result = None

    if report_id:

        started = time.perf_counter()

        result = (
            supabase
            .table("medical_reports")
            .select("*")
            .eq("id", report_id)
            .single()
            .execute()
        )

        if not result.data:
            raise ValueError(
                "Medical report not found."
            )

        row = result.data

        report_result = analyze_report(
            row.get("extracted_text", "")
        )

        _log(
            case_id,
            "report_agent",
            started,
            report_result,
        )

    # ---------------------------------------------------------
    # 3. Medical Image / X-ray Agent
    # ---------------------------------------------------------
    image_result = None

    if image_id:

        started = time.perf_counter()

        result = (
            supabase
            .table("medical_images")
            .select("*")
            .eq("id", image_id)
            .single()
            .execute()
        )

        if not result.data:
            raise ValueError(
                "Medical image not found."
            )

        row = result.data

        storage_path = row.get("file_url")

        if not storage_path:
            raise ValueError(
                "Medical image storage path is missing."
            )

        temp_path = None

        try:
            # Download the private image using the
            # server-side Supabase client.
            image_bytes = download_file(
                "medical-images",
                storage_path,
            )

            suffix = (
                Path(
                    row.get(
                        "file_name",
                        "xray.jpg",
                    )
                ).suffix
                or ".jpg"
            )

            with NamedTemporaryFile(
                delete=False,
                suffix=suffix,
            ) as temp_file:

                temp_file.write(
                    image_bytes
                )

                temp_path = temp_file.name

            # Run the actual X-ray model
            image_result = analyze_image(
                temp_path
            )

            # Store the result with the image record
            supabase.table(
                "medical_images"
            ).update({
                "analysis_status": "completed",
                "analysis_result": image_result,
            }).eq(
                "id",
                image_id,
            ).execute()

            _log(
                case_id,
                "image_agent",
                started,
                image_result,
            )

        except FileNotFoundError as exc:

            image_result = {
                "status": "model_not_available",
                "message": str(exc),
                "clinical_note": (
                    "The X-ray model is not currently "
                    "available. No image classification "
                    "was performed."
                ),
            }

            _log(
                case_id,
                "image_agent",
                started,
                image_result,
                status="unavailable",
            )

        except Exception as exc:

            image_result = {
                "status": "analysis_failed",
                "message": str(exc),
                "clinical_note": (
                    "The image could not be analyzed. "
                    "Professional review is required."
                ),
            }

            _log(
                case_id,
                "image_agent",
                started,
                image_result,
                status="failed",
            )

        finally:

            if temp_path:
                Path(
                    temp_path
                ).unlink(
                    missing_ok=True
                )

    # ---------------------------------------------------------
    # 4. Medical Knowledge RAG Agent
    # ---------------------------------------------------------
    started = time.perf_counter()

    query_parts = [
        symptoms_text
    ]

    if report_result:

        query_parts.append(
            str(
                report_result.get(
                    "reported_findings",
                    [],
                )
            )
        )

        query_parts.append(
            str(
                report_result.get(
                    "summary",
                    "",
                )
            )
        )

    if image_result:

        query_parts.append(
            str(
                image_result.get(
                    "prediction",
                    "",
                )
            )
        )

    query = " ".join(
        part for part in query_parts
        if part
    )

    knowledge = retrieve_knowledge(
        query,
        top_k=5,
    )

    _log(
        case_id,
        "rag_agent",
        started,
        knowledge,
    )

    # ---------------------------------------------------------
    # 5. Diagnosis Support Agent
    # ---------------------------------------------------------
    started = time.perf_counter()

    support = generate_support_summary(
        symptoms=symptoms,
        report=report_result,
        image=image_result,
        knowledge=knowledge,
    )

    _log(
        case_id,
        "diagnosis_support_agent",
        started,
        support,
    )

    # ---------------------------------------------------------
    # 6. Save complete case result
    # ---------------------------------------------------------
    supabase.table(
        "cases"
    ).update({

        "symptoms": symptoms,

        "report_findings": report_result,

        "image_findings": image_result,

        "rag_context": knowledge,

        "possible_conditions": support.get(
            "possible_conditions",
            [],
        ),

        "supporting_evidence": support.get(
            "supporting_evidence",
            [],
        ),

        "uncertainties": support.get(
            "uncertainties",
            [],
        ),

        "risk_indicators": support.get(
            "risk_indicators",
            [],
        ),

        "recommended_next_steps": support.get(
            "recommended_next_steps",
            [],
        ),

        "clinical_summary": support.get(
            "clinical_summary"
        ),

        "status": "reviewed",

    }).eq(
        "id",
        case_id,
    ).execute()

    # ---------------------------------------------------------
    # 7. Final multi-agent response
    # ---------------------------------------------------------
    return {
        "case_id": case_id,

        "symptoms": symptoms,

        "report": report_result,

        "image": image_result,

        "knowledge": knowledge,

        "support": support,

        "workflow": [
            "patient_agent",
            "report_agent" if report_id else None,
            "image_agent" if image_id else None,
            "rag_agent",
            "diagnosis_support_agent",
        ],

        "clinical_note": (
            "MAHIP provides AI-assisted research and "
            "decision-support information. The generated "
            "output is not a definitive medical diagnosis "
            "and should be reviewed by a qualified "
            "healthcare professional."
        ),
    }