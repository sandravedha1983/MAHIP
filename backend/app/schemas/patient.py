from datetime import date
from uuid import UUID
from pydantic import BaseModel


class PatientCreate(BaseModel):
    profile_id: UUID
    date_of_birth: date | None = None
    gender: str | None = None
    blood_group: str | None = None
    medical_history: str | None = None
    allergies: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None


class PatientResponse(PatientCreate):
    id: UUID
