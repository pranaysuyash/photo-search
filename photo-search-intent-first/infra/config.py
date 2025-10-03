"""
Centralized configuration management for the photo-search backend.

Loads from environment variables with defaults and validation.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator
from pydantic import ConfigDict


class Config(BaseModel):
    """Application configuration loaded from environment."""

    # API settings
    api_token: Optional[str] = Field(default=None, description="API token for auth")
    dev_no_auth: bool = Field(default=False, description="Disable auth in dev mode")
    api_log_level: str = Field(default="info", description="API logging level")
    cors_origins: List[str] = Field(default_factory=lambda: [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://0.0.0.0:8000",
        "app://local",
    ], description="Allowed CORS origins")

    # Model and provider settings
    photovault_model_dir: Optional[Path] = Field(default=None, description="Local model directory")
    sentence_transformers_home: Optional[Path] = Field(default=None, description="Sentence transformers cache")
    transformers_offline: bool = Field(default=False, description="Run transformers offline")
    offline_mode: bool = Field(default=False, description="General offline mode")

    # Storage and paths
    ps_appdata_dir: Optional[Path] = Field(default=None, description="App data directory")
    storage_backend: str = Field(default="file", description="Storage backend: 'file' or 'sqlite'")

    # Other
    env: str = Field(default="dev", description="Environment (dev/prod)")

    @field_validator('cors_origins', mode='before')
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v

    @field_validator('photovault_model_dir', 'sentence_transformers_home', 'ps_appdata_dir', mode='before')
    def expand_path(cls, v):
        if v:
            return Path(v).expanduser().resolve()
        return v

    model_config = ConfigDict(
        extra='ignore'
    )


# Load config from environment
def load_config() -> Config:
    """Load configuration from environment variables."""
    # Load .env if present
    repo_root = Path(__file__).resolve().parents[2]
    env_path = repo_root / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            key = k.strip()
            val = v.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val

    # Parse from env with explicit mapping
    cors_origins_value = [origin.strip() for origin in os.environ.get("CORS_ORIGINS", "").split(",") if origin.strip()]
    if not cors_origins_value:
        cors_origins_value = [
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:5174",
            "http://localhost:5174",
            "http://127.0.0.1:8000",
            "http://localhost:8000",
            "http://0.0.0.0:8000",
            "app://local",
        ]

    return Config(
        api_token=os.environ.get("API_TOKEN") or None,
        dev_no_auth=os.environ.get("DEV_NO_AUTH", "").strip() == "1" or os.environ.get("ENV", "").strip().lower() in ("dev", "development"),
        api_log_level=os.environ.get("API_LOG_LEVEL", "info").strip().lower(),
        cors_origins=cors_origins_value,
        photovault_model_dir=Path(os.environ["PHOTOVAULT_MODEL_DIR"]) if os.environ.get("PHOTOVAULT_MODEL_DIR") else None,
        sentence_transformers_home=Path(os.environ["SENTENCE_TRANSFORMERS_HOME"]) if os.environ.get("SENTENCE_TRANSFORMERS_HOME") else None,
        transformers_offline=os.environ.get("TRANSFORMERS_OFFLINE", "").strip() == "1",
        offline_mode=os.environ.get("OFFLINE_MODE", "").strip() == "1",
        ps_appdata_dir=Path(os.environ["PS_APPDATA_DIR"]) if os.environ.get("PS_APPDATA_DIR") else None,
        storage_backend=os.environ.get("STORAGE_BACKEND", "file").strip().lower(),
        env=os.environ.get("ENV", "dev").strip(),
    )


# Global config instance
config = load_config()