from datetime import date, time
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.core.security import CurrentUser, get_current_user
from app.db import supabase as supabase_module
from app.main import app

fastapi_app = app.app

PATIENT_PROFILE_ID = UUID("9a527a85-35c7-4df8-9b2e-8ba4f67d4b92")
OTHER_PROFILE_ID = UUID("aaf5f413-c626-4c0e-aef4-0a5405406a57")
PATIENT_ID = "a3909501-1e7f-4591-8fda-2038734d3d8a"
DOCTOR_ID = "25b4669a-d73f-4998-93de-2db1195e780b"


class FakeSupabase:
    def __init__(self):
        self.patients = []
        self.appointments = []
        self.doctors = [{
            "id": DOCTOR_ID,
            "profile_id": str(OTHER_PROFILE_ID),
            "specialization": "General Medicine",
            "qualification": "MBBS",
            "experience_years": 5,
            "consultation_fee": 500,
            "bio": "Primary care physician",
            "is_available": True,
            "profiles": {"full_name": "Vicky", "email": "doctor@example.com"},
        }]

    def table(self, name):
        return FakeQuery(self, name)


class FakeQuery:
    def __init__(self, database, table):
        self.database = database
        self.table_name = table
        self.filters = {}
        self.insert_row = None
        self.upsert_row = None

    def select(self, fields):
        return self

    def eq(self, field, value):
        self.filters[field] = str(value)
        return self

    def ilike(self, field, value):
        return self

    def maybe_single(self):
        return self

    def single(self):
        return self

    def limit(self, count):
        return self

    def order(self, field):
        return self

    def upsert(self, row, on_conflict=None):
        self.upsert_row = row
        return self

    def insert(self, row):
        self.insert_row = row
        return self

    def execute(self):
        if self.table_name == "patients":
            if self.upsert_row:
                existing = next(
                    (row for row in self.database.patients if row["profile_id"] == self.upsert_row["profile_id"]),
                    None,
                )
                if existing is None:
                    existing = {"id": PATIENT_ID, **self.upsert_row}
                    self.database.patients.append(existing)
                return FakeResult([existing])
            rows = [row for row in self.database.patients if all(str(row.get(k)) == v for k, v in self.filters.items())]
            return FakeResult(rows)

        if self.table_name == "doctors":
            rows = [row for row in self.database.doctors if all(str(row.get(k)) == v for k, v in self.filters.items())]
            return FakeResult(rows)

        if self.table_name == "appointments":
            if self.insert_row:
                row = {"id": "appointment-1", "status": "scheduled", **self.insert_row}
                self.database.appointments.append(row)
                return FakeResult([row])
            rows = [row for row in self.database.appointments if all(str(row.get(k)) == v for k, v in self.filters.items())]
            return FakeResult(rows)

        if self.table_name == "cases":
            return FakeResult([])
        return FakeResult([])


class FakeResult:
    def __init__(self, data):
        self.data = data


@pytest.fixture
def api(monkeypatch):
    database = FakeSupabase()
    monkeypatch.setattr(supabase_module, "supabase", database)
    from app.api import patients as patients_module
    from app.api import doctors as doctors_module
    from app.api import appointments as appointments_module
    monkeypatch.setattr(patients_module, "supabase", database)
    monkeypatch.setattr(doctors_module, "supabase", database)
    monkeypatch.setattr(appointments_module, "supabase", database)
    fastapi_app.dependency_overrides[get_current_user] = lambda: CurrentUser(PATIENT_PROFILE_ID, "patient")
    with TestClient(app) as test_client:
        yield test_client, database
    fastapi_app.dependency_overrides.clear()


def test_get_doctors_includes_profile_details(api):
    client, _ = api
    response = client.get("/doctors")

    assert response.status_code == 200
    assert response.json() == [{
        "id": DOCTOR_ID,
        "profile_id": str(OTHER_PROFILE_ID),
        "name": "Vicky",
        "email": "doctor@example.com",
        "specialization": "General Medicine",
        "qualification": "MBBS",
        "experience_years": 5,
        "consultation_fee": 500,
        "bio": "Primary care physician",
        "is_available": True,
    }]


def test_patient_create_is_idempotent_and_profile_scoped(api):
    client, database = api
    payload = {"profile_id": str(PATIENT_PROFILE_ID)}

    first = client.post("/patients", json=payload)
    second = client.post("/patients", json=payload)

    assert first.status_code == second.status_code == 200
    assert first.json()["id"] == second.json()["id"] == PATIENT_ID
    assert len(database.patients) == 1


def test_patient_create_rejects_another_profile(api):
    client, _ = api
    response = client.post("/patients", json={"profile_id": str(OTHER_PROFILE_ID)})

    assert response.status_code == 403


def test_patient_me_returns_current_users_record(api):
    client, _ = api
    client.post("/patients", json={"profile_id": str(PATIENT_PROFILE_ID)})

    response = client.get("/patients/me")

    assert response.status_code == 200
    assert response.json()["profile_id"] == str(PATIENT_PROFILE_ID)


def test_patient_lookup_rejects_other_patient(api, monkeypatch):
    client, database = api
    database.patients.append({"id": PATIENT_ID, "profile_id": str(OTHER_PROFILE_ID)})

    response = client.get(f"/patients/{PATIENT_ID}")

    assert response.status_code == 403


def test_appointment_uses_existing_doctor_uuid(api):
    client, database = api
    client.post("/patients", json={"profile_id": str(PATIENT_PROFILE_ID)})

    response = client.post("/appointments", json={
        "patient_id": PATIENT_ID,
        "doctor_id": DOCTOR_ID,
        "appointment_date": date.today().isoformat(),
        "appointment_time": time(9, 0).isoformat(),
    })

    assert response.status_code == 200
    assert response.json()["doctor_id"] == DOCTOR_ID
    assert len(database.appointments) == 1


def test_appointment_rejects_nonexistent_doctor(api):
    client, _ = api
    client.post("/patients", json={"profile_id": str(PATIENT_PROFILE_ID)})

    response = client.post("/appointments", json={
        "patient_id": PATIENT_ID,
        "doctor_id": "a9d07e8d-1550-4fdc-b507-bfcf6bb7a421",
        "appointment_date": date.today().isoformat(),
        "appointment_time": time(9, 0).isoformat(),
    })

    assert response.status_code == 404


def test_appointment_rejects_invalid_uuid(api):
    client, _ = api
    response = client.post("/appointments", json={
        "patient_id": PATIENT_ID,
        "doctor_id": "not-a-doctor-id",
        "appointment_date": date.today().isoformat(),
        "appointment_time": time(9, 0).isoformat(),
    })

    assert response.status_code == 422
