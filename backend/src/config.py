"""Application configuration using pydantic-settings."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "Kuramei API"
    debug: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/kuramei.db"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    @property
    def database_path(self) -> Path:
        """Extract the database file path from the URL."""
        # sqlite+aiosqlite:///./data/kuramei.db -> ./data/kuramei.db
        url = self.database_url
        if url.startswith("sqlite"):
            path = url.split("///")[-1]
            return Path(path)
        return Path("./data/kuramei.db")


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
