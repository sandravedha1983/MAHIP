from pydantic import BaseModel, Field


class CaseCreate(BaseModel):
    patient_id: str
    symptoms: list[str] = Field(default_factory=list)
    medical_history: dict = Field(default_factory=dict)


class OrchestratorRequest(BaseModel):
    patient_id: str
    symptoms: str = ""
    report_id: str | None = None
    image_id: str | None = None


class CaseResponse(BaseModel):
    id: str
    patient_id: str
    status: str
    clinical_summary: str | None = None
