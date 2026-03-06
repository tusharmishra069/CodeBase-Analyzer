import uuid
from sqlalchemy import Column, String, Integer, DateTime, JSON
from sqlalchemy.sql import func
from database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    repository_url = Column(String(255), index=True, nullable=False)
    status = Column(String(50), default="PENDING", index=True) # PENDING, PROCESSING, COMPLETED, FAILED
    progress = Column(Integer, default=0)
    message = Column(String(255), default="Job created")
    result = Column(JSON, nullable=True) # The final LLM code review object
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
