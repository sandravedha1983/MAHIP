from app.services.llm import LLMService
from app.services.report_service import basic_report_findings


llm = LLMService()


def analyze_report(extracted_text: str) -> dict:
    """
    Analyze an extracted medical report.

    This agent summarizes information explicitly present in the
    uploaded report. It does not establish a medical diagnosis.
    """

    if not extracted_text.strip():
        return {
            "status": "no_text",
            "reported_findings": [],
            "summary": "No readable text was found in the report.",
            "source_preview": "",
            "clinical_note": (
                "The uploaded document could not be interpreted. "
                "Professional review is required."
            ),
        }

    base = basic_report_findings(extracted_text)

    result = llm.generate_json(
        (
            "Summarize the provided medical report conservatively. "
            "Identify findings explicitly reported in the document. "
            "Preserve uncertainty when the report is uncertain. "
            "Do not diagnose disease. "
            "Do not invent symptoms, laboratory values, measurements, "
            "medications, or conclusions that are not present."
        ),
        extracted_text,
        {
            "reported_findings": base["flagged_lines"],
            "summary": (
                "The report was processed for documented findings. "
                "Professional clinical review is required."
            ),
            "source_preview": base["text_preview"],
        },
    )

    result["clinical_note"] = (
        "This is an AI-assisted medical-report summary. "
        "It is not a diagnosis or a substitute for professional "
        "medical interpretation."
    )

    return result