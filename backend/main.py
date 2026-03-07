import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import analysis, profile

logger = logging.getLogger(__name__)


# ── Lifespan: validate env & create tables once on startup ────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate()
    Base.metadata.create_all(bind=engine)
    logger.info("Startup complete [env=%s]", settings.APP_ENV)
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="AI Code Analyzer API",
    description="Submit a GitHub repository URL and receive a Staff Engineer AI code review.",
    version="2.0.0",
    lifespan=lifespan,
    # disable Swagger/ReDoc in production
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ── Request timing middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
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


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "AI Code Analyzer API", "version": "2.0.0", "env": settings.APP_ENV}


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok"}
