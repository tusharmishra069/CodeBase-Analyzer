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

    # ── AI Engine tuning (Railway/low-memory friendly) ─────────────────────
    EMBEDDING_MODEL_NAME: str = os.getenv(
        "EMBEDDING_MODEL_NAME",
        "paraphrase-MiniLM-L3-v2",  # 30 MB vs 90 MB — 5-10x faster embedding
    )
    EMBEDDING_BATCH_SIZE: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "32"))  # Faster model, larger batches
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "500"))  # Smaller chunks = faster to embed
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "50"))  # Less overlap = less redundant embeddings
    RETRIEVAL_QUERY_COUNT: int = int(os.getenv("RETRIEVAL_QUERY_COUNT", "2"))  # 2 parallel > 4 serial
    RETRIEVAL_K_PER_QUERY: int = int(os.getenv("RETRIEVAL_K_PER_QUERY", "5"))  # Targeted results
    MAX_EMBED_BYTES: int = int(os.getenv("MAX_EMBED_BYTES", str(1 * 1024 * 1024)))  # 1 MB = faster
    LLM_MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "1200"))  # Shorter responses

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # ── GitHub ────────────────────────────────────────────────────────────────
    GITHUB_TOKEN: str | None = os.getenv("GITHUB_TOKEN")

    # ── Repo parser limits ────────────────────────────────────────────────────────────────
    # Railway free tier (512 MB): keep these conservative to stay in RAM.
    # 200 KB per file, 30 files max, 2 MB total content — faster analysis, still comprehensive.
    MAX_FILE_SIZE_BYTES: int = int(os.getenv("MAX_FILE_SIZE_BYTES", str(200 * 1024)))  # 200 KB per file
    MAX_FILE_COUNT: int = int(os.getenv("MAX_FILE_COUNT", "30"))  # Cap at 30 files

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Comma-separated origins. In production never use "*".
    # Dev default allows the local Next.js dev server only.
    ALLOWED_ORIGINS: list[str] = [
        o.strip().rstrip("/")
        for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
        if o.strip()
    ]

    # ── Authentication ────────────────────────────────────────────────────────
    # A strong random secret used to sign/verify API keys.
    # Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    API_SECRET_KEY: str = os.getenv("API_SECRET_KEY", "")

    # ── Rate limiting ─────────────────────────────────────────────────────────
    # Uses the `limits` library string syntax: "N/period"
    # Separate limits for cheap (status) vs expensive (AI) endpoints.
    RATE_LIMIT_DEFAULT: str = os.getenv("RATE_LIMIT_DEFAULT", "60/minute")
    RATE_LIMIT_AI: str = os.getenv("RATE_LIMIT_AI", "10/minute")
    RATE_LIMIT_STATUS: str = os.getenv("RATE_LIMIT_STATUS", "120/minute")

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    def validate(self) -> None:
        errors: list[str] = []
        if not self.GROQ_API_KEY:
            errors.append("GROQ_API_KEY is required")
        if not self.DATABASE_URL:
            errors.append("DATABASE_URL is required")
        if not self.API_SECRET_KEY:
            errors.append("API_SECRET_KEY is required")
        if "*" in self.ALLOWED_ORIGINS and self.is_production:
            errors.append(
                "ALLOWED_ORIGINS must not contain '*' in production — "
                "set explicit frontend origin(s)"
            )
        if errors:
            raise ValueError("Missing required environment variables: " + ", ".join(errors))


def _configure_logging(env: str) -> None:
    # Keep INFO in production so Render logs show startup status and errors
    level = "INFO"
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
