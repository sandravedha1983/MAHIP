from datetime import date, time
from uuid import UUID
from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    patient_id: UUID
    doctor_id: UUID
    appointment_date: date
    appointment_time: time
    reason: str | None = None


class AppointmentResponse(AppointmentCreate):
    id: UUID
    status: str
