from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.api import health, auth, patients, doctors, appointments, reports, images, cases, orchestrator, agent_logs
from app.api import rag
settings = get_settings()

LOCAL_FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Multi-Agent Healthcare Intelligence Platform backend.",
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(reports.router)
app.include_router(images.router)
app.include_router(cases.router)
app.include_router(orchestrator.router)
app.include_router(agent_logs.router)
app.include_router(rag.router)

@app.get("/")
def root():
    return {
        "message": "MAHIP Backend is running",
        "status": "success",
        "docs": "/docs",
    }


# Wrapping the complete ASGI app ensures CORS headers are also applied to
# unhandled server-error responses, not only successful and validation routes.
app = CORSMiddleware(
    app=app,
    allow_origins=LOCAL_FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
