import traceback
import gc
import time
import hashlib
from concurrent.futures import ThreadPoolExecutor

from app.core.database import SessionLocal
from app.models.job import Job
from app.services import repo_parser, ai_engine, pattern_analyzer
from app.core.config import settings

# Module-level singleton — Groq client and embedding ref created once per process.
# Safe with preload_app=True (single worker, no forking after load).
_analyzer: ai_engine.CodeAnalyzer | None = None


def _get_analyzer() -> ai_engine.CodeAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = ai_engine.CodeAnalyzer()
    return _analyzer


def _update_job(db, job, *, status=None, progress=None, message=None) -> None:
    """Applies fields to a job row and commits in one call."""
    if status is not None:
        job.status = status
    if progress is not None:
        job.progress = progress
    if message is not None:
        job.message = message
    db.commit()


def analyze_github_repo(job_id: str, repository_url: str) -> None:
    """
    ARCHITECT-DESIGNED ultra-fast 6-phase analysis (<45 seconds):
    
    Phase 1: Clone + Parse (5s)
    Phase 2: Smart Sampling (2s) — select golden set of files
    Phase 3: Pattern Analysis (3s) — catch 80% of bugs via regex
    Phase 4: Conditional Embedding (0-5s) — only if patterns miss bugs
    Phase 5: LLM Synthesis (8-15s) — sense-make the findings
    Phase 6: Result (instant)
    """
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        db.close()
        return

    repo_dir = None
    start_time = time.time()
    timings = {}

    try:
        # ── PHASE 1: Clone & Parse (5s) ───────────────────────────────────────
        _update_job(db, job, status="PROCESSING", progress=10, message="⚡ Cloning repository...")
        clone_start = time.time()
        repo_dir = repo_parser.clone_repository(repository_url)
        timings["clone"] = time.time() - clone_start
        gc.collect()

        _update_job(db, job, progress=20, message="📂 Parsing files...")
        parse_start = time.time()
        all_files = repo_parser.parse_codebase(repo_dir)

        if not all_files:
            raise ValueError(
                "No supported source files found in the repository. "
                "Make sure it contains code files (Python, JS/TS, Go, etc.)."
            )

        timings["parse"] = time.time() - parse_start
        gc.collect()

        # ── PHASE 2: Smart Sampling (2s) ──────────────────────────────────────
        _update_job(db, job, progress=30, message="🎯 Smart file sampling...")
        sample_start = time.time()
        golden_files = pattern_analyzer.smart_sample_files(all_files)
        timings["sampling"] = time.time() - sample_start
        gc.collect()

        # ── PHASE 3: Pattern Analysis (80% of bugs in <3s) ────────────────────
        _update_job(db, job, progress=40, message="🔍 Pattern-based security scan...")
        pattern_start = time.time()
        pattern_bugs = pattern_analyzer.analyze_code_patterns(all_files)
        timings["patterns"] = time.time() - pattern_start
        gc.collect()

        # ── PHASE 4: Conditional Embedding (only if patterns found <5 bugs) ───
        retrieved_chunks = []
        should_embed = len(pattern_bugs) < 5
        
        if should_embed:
            _update_job(
                db, job,
                progress=50,
                message=f"🤖 Only {len(pattern_bugs)} bugs. Running semantic analysis..."
            )
            embed_start = time.time()
            
            analyzer = _get_analyzer()
            vectorstore = analyzer.create_vector_store(golden_files)
            timings["embed"] = time.time() - embed_start
            gc.collect()

            retrieval_start = time.time()
            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = [
                    executor.submit(analyzer._single_query_retrieve, vectorstore, q)
                    for q in ["bugs errors security vulnerabilities",
                              "architecture scalability performance"]
                ]
                results = [f.result() for f in futures]

            seen = set()
            for result in results:
                for chunk in result:
                    chunk_key = chunk[:100]
                    if chunk_key not in seen:
                        seen.add(chunk_key)
                        retrieved_chunks.append(chunk)

            timings["retrieval"] = time.time() - retrieval_start
            del vectorstore
            gc.collect()
        else:
            timings["embed"] = 0
            timings["retrieval"] = 0

        # ── PHASE 5: LLM Synthesis ────────────────────────────────────────────
        _update_job(
            db, job,
            progress=70,
            message=f"🧠 LLM synthesis ({len(pattern_bugs)} bugs found)..."
        )
        llm_start = time.time()
        
        analyzer = _get_analyzer()
        context_chunks = retrieved_chunks[:15] if retrieved_chunks else []
        final_result = analyzer.analyze_with_context(
            pattern_bugs=pattern_bugs,
            code_chunks=context_chunks,
            files_analyzed=len(all_files)
        )
        
        timings["llm"] = time.time() - llm_start
        del retrieved_chunks
        gc.collect()

        # ── PHASE 6: Complete ─────────────────────────────────────────────────
        health = final_result.get("health_score", "?")
        bug_count = len(final_result.get("bugs", []))
        imp_count = len(final_result.get("improvements", []))
        total_time = time.time() - start_time

        job.result = final_result
        _update_job(
            db, job,
            status="COMPLETED",
            progress=100,
            message=f"✓ {total_time:.0f}s — {health}, {bug_count} bugs, {imp_count} improvements",
        )

        print(f"""
[worker] Job {job_id} SUCCESS (ARCHITECT DESIGN)
  Clone:     {timings.get('clone', 0):.1f}s
  Parse:     {timings.get('parse', 0):.1f}s
  Sampling:  {timings.get('sampling', 0):.1f}s
  Patterns:  {timings.get('patterns', 0):.1f}s
  Embed:     {timings.get('embed', 0):.1f}s (conditional)
  Retrieval: {timings.get('retrieval', 0):.1f}s
  LLM:       {timings.get('llm', 0):.1f}s
  ──────────────────────
  Total:     {total_time:.1f}s
  
  Pattern bugs: {len(pattern_bugs)} | LLM enhancements: +{bug_count - len(pattern_bugs)}
""")

    except Exception as e:
        traceback.print_exc()
        total_time = time.time() - start_time
        print(f"[worker] Job {job_id} FAILED after {total_time:.1f}s: {e}")
        _update_job(db, job, status="FAILED", message=f"Analysis failed: {str(e)}"[:300])

    finally:
        if repo_dir:
            repo_parser.cleanup_repository(repo_dir)
        gc.collect()
        db.close()

