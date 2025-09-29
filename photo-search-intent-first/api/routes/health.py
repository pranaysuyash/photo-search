from __future__ import annotations

import time
from fastapi import APIRouter
from fastapi.responses import JSONResponse

_APP_START = time.time()
router = APIRouter()

@router.get("/health")
def health_root():
    now = time.time()
    return {"ok": True, "uptime_seconds": max(0, int(now - _APP_START))}

@router.get("/api/health")
def health_api():
    return {"ok": True}

@router.get("/api/ping")
def health_ping():
    return {"ok": True}

@router.get("/monitoring")
def monitoring_get():
    return {"ok": True, "status": "up"}

@router.post("/monitoring")
def monitoring_post():
    return {"ok": True}

@router.get("/api/monitoring")
def monitoring_api_get():
    return {"ok": True}

@router.post("/api/monitoring")
def monitoring_api_post():
    return {"ok": True}

@router.get("/")
def root():
    return {"ok": True, "message": "Photo Search API", "app_path": "/app/"}

@router.get("/tech.json")
def tech_manifest():
    return JSONResponse(
        {
            "frontend": "react+vite",
            "shell": "electron",
            "backend": "fastapi",
            "streamlit": False,
            "version": "0.1.0",
        }
    )
