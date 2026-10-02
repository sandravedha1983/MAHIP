from fastapi import APIRouter, HTTPException
from supabase_auth.errors import AuthApiError

from app.db.supabase import supabase
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignupRequest):
    # Do not trust arbitrary role escalation in a production system.
    safe_role = "patient" if payload.role not in {"patient", "doctor", "admin"} else payload.role

    try:
        response = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": {
                "data": {
                    "full_name": payload.full_name,
                    "role": safe_role,
                }
            },
        })
    except AuthApiError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not response.user:
        raise HTTPException(status_code=400, detail="Signup failed.")

    session = response.session
    role = _profile_role(response.user.id)
    return AuthResponse(
        access_token=session.access_token if session else None,
        refresh_token=session.refresh_token if session else None,
        user_id=str(response.user.id),
        role=role,
        message="Signup successful. Confirm email if required.",
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password,
        })
    except AuthApiError as exc:
        raise HTTPException(status_code=401, detail="Invalid credentials.") from exc

    if not response.user or not response.session:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    role = _profile_role(response.user.id)
    return AuthResponse(
        access_token=response.session.access_token,
        refresh_token=response.session.refresh_token,
        user_id=str(response.user.id),
        role=role,
        message="Login successful.",
    )


def _profile_role(profile_id: str) -> str:
    try:
        result = (
            supabase.table("profiles")
            .select("role")
            .eq("id", str(profile_id))
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to resolve account role.") from exc

    if not result.data or result.data.get("role") not in {"patient", "doctor", "admin"}:
        raise HTTPException(status_code=403, detail="An active MAHIP profile is required.")
    return result.data["role"]
