import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv; load_dotenv()
from dotenv import load_dotenv

load_dotenv()

# We expect a pooled connection string from Neon, which works fine with SQLAlchemy.
# Ensure sslmode=require is in the connection string usually provided by Neon.
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Special handling: if psycopg2 is used, we ensure the URL scheme is correct
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Neon recommendations for connection pooling in SQLAlchemy
# Typically pool_size and max_overflow are governed by the Neon PgBouncer configuration.
engine = create_engine(
    DATABASE_URL, 
    pool_size=5, 
    max_overflow=10, 
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
