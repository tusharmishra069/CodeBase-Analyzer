import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.core.limiter import limiter
from app.api.routes import analysis, profile

logger = logging.getLogger(__name__)


# ── Lifespan: validate env & create tables once on startup ────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Log every env flag so Render's log panel shows what was injected
        print(f"[startup] APP_ENV      = {settings.APP_ENV}")
        print(f"[startup] GROQ_API_KEY = {'SET' if settings.GROQ_API_KEY else 'MISSING'}")
        print(f"[startup] DATABASE_URL = {'SET' if settings.DATABASE_URL else 'MISSING'}")
        print(f"[startup] API_SECRET   = {'SET' if settings.API_SECRET_KEY else 'MISSING'}")
        print(f"[startup] ALLOWED_ORIGINS = {settings.ALLOWED_ORIGINS}")
        settings.validate()
        Base.metadata.create_all(bind=engine)
        print("[startup] OK — all checks passed")
    except Exception as exc:
        print(f"[startup] FAILED: {exc}")
        raise
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="AI Code Analyzer API",
    description="Submit a GitHub repository URL and receive a Staff Engineer AI code review.",
    version="2.0.0",
    lifespan=lifespan,
    # Swagger/ReDoc disabled in production — reduces attack surface
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# ── Rate limiter ──────────────────────────────────────────────────────────────
# Must be attached before other middleware so 429s bypass the rest of the stack
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Security notes:
#   - allow_credentials=True is safe only when origins are explicit (never "*")
#   - In dev the default ALLOWED_ORIGINS is ["http://localhost:3000"]
#   - In prod it must be set via the ALLOWED_ORIGINS env var
_wildcard_only = settings.ALLOWED_ORIGINS == ["*"]
if _wildcard_only:
    # Wildcard + credentials is forbidden by the CORS spec and rejected by
    # browsers. Fall back to credentials=False to avoid a hard browser error.
    _allow_credentials = False
    logger.warning(
        "ALLOWED_ORIGINS='*' — running with credentials=False. "
        "Set explicit origins for authenticated requests."
    )
else:
    _allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=_allow_credentials,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    max_age=600,   # preflight cache 10 min
)


# ── Request timing + security headers middleware ──────────────────────────────
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000

    logger.info(
        "%s %s → %s  (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )

    # Add security headers to every response
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
    return response


# ── Global error handlers ─────────────────────────────────────────────────────
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Not found"})


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    logger.exception("Unhandled server error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(analysis.router)
app.include_router(profile.router)


# ── Health check (unauthenticated — used by load balancers / Docker) ──────────
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "AI Code Analyzer API", "version": "2.0.0", "env": settings.APP_ENV}


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok"}

