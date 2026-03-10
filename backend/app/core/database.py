from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

_url = settings.DATABASE_URL
if _url.startswith("postgres://"):
    _url = _url.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    _url,
    # ── Tuned for Neon free tier (suspends after ~5 min of inactivity) ────────
    # Neon silently kills idle TCP connections when the compute suspends.
    # Without these settings SQLAlchemy hands out a dead connection from the
    # pool → "SSL SYSCALL error: EOF detected" → 502 on every polling request.
    pool_size=2,           # 1 Gunicorn worker only needs 1-2 connections
    max_overflow=3,        # small burst headroom
    pool_timeout=10,       # fail fast instead of hanging for 30 s
    pool_recycle=300,      # replace connections every 5 min (matches Neon timeout)
    pool_pre_ping=True,    # runs "SELECT 1" before handing out each connection
    connect_args={
        "keepalives": 1,
        "keepalives_idle": 10,    # first keepalive after 10 s idle
        "keepalives_interval": 5, # retry every 5 s
        "keepalives_count": 3,    # give up after 3 misses (~15 s total)
        "connect_timeout": 10,    # abort new connections after 10 s
    },
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a database session and closes it on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
