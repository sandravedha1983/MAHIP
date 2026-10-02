from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_invalid_login_returns_401():
    response = client.post(
        "/auth/login",
        json={"email": "bad@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]
