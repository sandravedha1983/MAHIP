from fastapi.testclient import TestClient

from app.api import auth as auth_module
from app.main import app

client = TestClient(app)


def test_login_returns_role_from_profile(monkeypatch):
    class FakeUser:
        id = "user-doctor-123"
        user_metadata = {"role": "doctor"}

    class FakeSession:
        access_token = "doctor-access-token"
        refresh_token = "doctor-refresh-token"

    class FakeAuthResponse:
        user = FakeUser()
        session = FakeSession()

    monkeypatch.setattr(
        auth_module.supabase.auth,
        "sign_in_with_password",
        lambda payload: FakeAuthResponse(),
    )

    class FakeProfileQuery:
        def select(self, fields):
            return self

        def eq(self, field, value):
            assert field == "id"
            assert value == FakeUser.id
            return self

        def maybe_single(self):
            return self

        def execute(self):
            class Result:
                data = {"role": "doctor"}

            return Result()

    monkeypatch.setattr(auth_module.supabase, "table", lambda name: FakeProfileQuery())

    response = client.post(
        "/auth/login",
        json={"email": "doctor@example.com", "password": "StrongPass123!"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["role"] == "doctor"
