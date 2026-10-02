from app.ml.image_model import xray_model


def analyze_image(local_path: str) -> dict:
    result = xray_model.predict(local_path)
    result["clinical_note"] = (
        "This is an AI-assisted image classification output, not a definitive diagnosis. "
        "Clinical interpretation by a qualified professional is required."
    )
    return result
