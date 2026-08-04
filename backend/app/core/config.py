from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Centralized, env-driven configuration.

    Defaults are chosen so the backend runs with zero setup for local
    hackathon development (SQLite, permissive CORS), while every value
    can be overridden via environment variables for a real deployment
    (Postgres via DATABASE_URL, a locked-down CORS_ORIGINS list, etc).
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "AgentLens AI"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Defaults to SQLite for zero-config local dev. Point at Postgres in
    # production, e.g. postgresql+asyncpg://user:pass@host:5432/agentlens
    DATABASE_URL: str = "sqlite+aiosqlite:///./agentlens.db"

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Where repositories are cloned/extracted for analysis. Cleaned up
    # after each scan completes (or fails).
    WORKSPACE_DIR: str = "/tmp/agentlens-workspaces"

    # Guardrails for repository analysis
    MAX_REPO_SIZE_MB: int = 250
    MAX_FILES_SCANNED: int = 5000
    CLONE_TIMEOUT_SECONDS: int = 60

    # Paritok
    PARITOK_API_BASE_URL: str = "https://api.paritok.dev"
    PARITOK_API_KEY: str = ""
    PARITOK_TIMEOUT_SECONDS: int = 30

    # LLM provider for AI Doctor narrative + Optimization Chat
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
