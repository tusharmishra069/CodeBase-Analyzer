import os
import shutil
import tempfile
from dotenv import load_dotenv

import database
import models
import repo_parser
import ai_engine

load_dotenv()

def analyze_github_repo(job_id: str, repository_url: str):
    """
    Background task to clone, parse, embed, and analyze a GitHub repository.
    """
    db = database.SessionLocal()
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    
    if not job:
        db.close()
        return

    repo_dir = None

    try:
        # Step 1: Processing
        job.status = "PROCESSING"
        job.progress = 10
        job.message = "Initializing repository analysis..."
        db.commit()

        # Step 2: Fetch Code
        job.progress = 30
        job.message = f"Cloning repository {repository_url}..."
        db.commit()
        
        repo_dir = repo_parser.clone_repository(repository_url)
        code_documents = repo_parser.parse_codebase(repo_dir)

        if not code_documents:
            raise ValueError("No supported code files found in the repository.")

        # Step 3: Parse and Vectorize
        job.progress = 60
        job.message = f"Generating vector embeddings for {len(code_documents)} files..."
        db.commit()
        
        analyzer = ai_engine.CodeAnalyzer()
        vectorstore = analyzer.create_vector_store(code_documents)

        # Step 4: LLM Analysis with Groq
        job.progress = 85
        job.message = "Running AI analysis via Groq..."
        db.commit()

        final_result = analyzer.analyze_codebase(vectorstore)

        # Step 5: Finalize
        job.progress = 100
        job.status = "COMPLETED"
        job.message = "Analysis complete."
        job.result = final_result
        db.commit()

    except Exception as e:
        import traceback
        traceback.print_exc()
        job.status = "FAILED"
        job.message = f"Error during analysis: {str(e)}"[:250]
        db.commit()
    finally:
        # Cleanup cloned repo and vector DB files
        if repo_dir:
            repo_parser.cleanup_repository(repo_dir)
        db.close()
