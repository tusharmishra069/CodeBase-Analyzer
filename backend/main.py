from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, engine, Base
from models import Job
from worker import analyze_github_repo
from fastapi.middleware.cors import CORSMiddleware

# Create tables if they don't exist yet
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Code Analyzer API")

# Add CORS to allow Next.js local frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    url: str

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Code Analyzer API"}

@app.post("/api/analyze")
def analyze_repo(req: AnalyzeRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if "github.com" not in req.url:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL")
    
    # Create the job in Neon Postgres
    job = Job(repository_url=req.url)
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Schedule the analysis as a background task
    background_tasks.add_task(analyze_github_repo, str(job.id), job.repository_url)
    
    return {"job_id": job.id, "status": job.status, "message": "Job queued successfully"}

@app.get("/api/jobs/{job_id}/status")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return {
        "job_id": job.id,
        "status": job.status,
        "progress": job.progress,
        "message": job.message,
        "result": job.result
    }
