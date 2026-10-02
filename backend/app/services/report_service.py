from io import BytesIO

from pypdf import PdfReader


def extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages).strip()


def basic_report_findings(text: str) -> dict:
    """
    Lightweight extraction for the prototype. It does not diagnose disease.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    abnormal_keywords = [
        "high", "low", "elevated", "decreased", "abnormal",
        "positive", "critical", "below", "above"
    ]
    flagged = [line for line in lines if any(k in line.lower() for k in abnormal_keywords)]
    return {
        "line_count": len(lines),
        "flagged_lines": flagged[:50],
        "text_preview": text[:4000],
    }
