import os
import logging
import logging.config
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ── Environment ───────────────────────────────────────────────────────────
    APP_ENV: str = os.getenv("APP_ENV", "development")   # development | production

    # ── LLM ──────────────────────────────────────────────────────────────────
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # ── GitHub ────────────────────────────────────────────────────────────────
    GITHUB_TOKEN: str | None = os.getenv("GITHUB_TOKEN")

    # ── Repo parser limits ────────────────────────────────────────────────────
    MAX_FILE_SIZE_BYTES: int = int(os.getenv("MAX_FILE_SIZE_BYTES", str(512 * 1024)))
    MAX_FILE_COUNT: int = int(os.getenv("MAX_FILE_COUNT", "120"))

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Comma-separated list, e.g. "https://myapp.com,https://www.myapp.com"
    ALLOWED_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")
        if o.strip()
    ]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    def validate(self) -> None:
        errors: list[str] = []
        if not self.GROQ_API_KEY:
            errors.append("GROQ_API_KEY is required")
        if not self.DATABASE_URL:
            errors.append("DATABASE_URL is required")
        if errors:
            raise ValueError("Missing required environment variables: " + ", ".join(errors))


def _configure_logging(env: str) -> None:
    level = "WARNING" if env == "production" else "INFO"
    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
            },
        },
        "root": {"level": level, "handlers": ["console"]},
        # silence noisy third-party loggers in production
        "loggers": {
            "httpx": {"level": "WARNING"},
            "httpcore": {"level": "WARNING"},
            "faiss": {"level": "WARNING"},
        },
    })


settings = Settings()
_configure_logging(settings.APP_ENV)
