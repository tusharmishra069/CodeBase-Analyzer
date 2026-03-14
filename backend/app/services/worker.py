import traceback
import gc
import time
from concurrent.futures import ThreadPoolExecutor

from app.core.database import SessionLocal
from app.models.job import Job
from app.services import repo_parser, ai_engine
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
    Optimized background task with parallel retrieval and aggressive memory cleanup.
    
    Bottleneck fixes:
    1. Parse + clone in sequence but with tight GC
    2. Parallel multi-query retrieval (3 queries at once)
    3. Batch embeddings to reduce memory spikes
    4. Free FAISS immediately after retrieval
    5. Timing metrics for performance monitoring
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
        # ── 1. Clone ──────────────────────────────────────────────────────────
        _update_job(db, job, status="PROCESSING", progress=10, message="Cloning repository...")
        clone_start = time.time()
        repo_dir = repo_parser.clone_repository(repository_url)
        timings["clone"] = time.time() - clone_start
        gc.collect()

        # ── 2. Parse ──────────────────────────────────────────────────────────
        _update_job(db, job, progress=25, message="Scanning repository files...")
        parse_start = time.time()
        code_documents = repo_parser.parse_codebase(repo_dir)

        if not code_documents:
            raise ValueError(
                "No supported source files found in the repository. "
                "Make sure it contains code files (Python, JS/TS, Go, etc.)."
            )

        file_count = len(code_documents)
        timings["parse"] = time.time() - parse_start
        gc.collect()

        _update_job(
            db, job,
            progress=40,
            message=f"Found {file_count} files. Embedding in batches...",
        )

        # ── 3. Embed with batching ────────────────────────────────────────────
        analyzer = _get_analyzer()
        embed_start = time.time()
        vectorstore = analyzer.create_vector_store(code_documents)
        timings["embed"] = time.time() - embed_start

        # Free intermediate objects
        del code_documents
        gc.collect()

        _update_job(
            db, job,
            progress=55,
            message=f"Embeddings done in {timings['embed']:.1f}s. Running parallel retrieval...",
        )

        # ── 4. Parallel multi-query retrieval ──────────────────────────────────
        retrieval_start = time.time()
        queries = [
            "architecture design patterns structure",
            "bugs errors exceptions error handling security",
            "performance optimization improvements scalability"
        ]

        # ThreadPoolExecutor — FAISS releases GIL during searches
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [
                executor.submit(analyzer._single_query_retrieve, vectorstore, q)
                for q in queries
            ]
            results = [f.result() for f in futures]

        # Flatten and deduplicate
        all_chunks = []
        seen = set()
        for result in results:
            for chunk in result:
                chunk_key = chunk[:100] if isinstance(chunk, str) else str(chunk)
                if chunk_key not in seen:
                    seen.add(chunk_key)
                    all_chunks.append(chunk)

        timings["retrieval"] = time.time() - retrieval_start
        gc.collect()

        # Free FAISS — critical for memory on Railway
        del vectorstore
        gc.collect()

        _update_job(
            db, job,
            progress=70,
            message=f"Retrieved {len(all_chunks)} chunks in {timings['retrieval']:.1f}s. AI review...",
        )

        # ── 5. LLM Analysis ───────────────────────────────────────────────────
        _update_job(db, job, progress=88, message="Staff Engineer AI is reviewing your codebase...")
        llm_start = time.time()
        final_result = analyzer.analyze_codebase_with_chunks(all_chunks)
        timings["llm"] = time.time() - llm_start

        del all_chunks
        gc.collect()

        # ── 6. Complete ───────────────────────────────────────────────────────
        health = final_result.get("health_score", "?")
        bug_count = len(final_result.get("bugs", []))
        imp_count = len(final_result.get("improvements", []))
        total_time = time.time() - start_time

        job.result = final_result
        _update_job(
            db, job,
            status="COMPLETED",
            progress=100,
            message=(
                f"✓ Complete in {total_time:.0f}s — Health: {health}, "
                f"{bug_count} bug{'s' if bug_count != 1 else ''} found, "
                f"{imp_count} improvement{'s' if imp_count != 1 else ''} suggested."
            ),
        )

        print(f"""
[worker] Job {job_id} SUCCESS
  Clone:     {timings.get('clone', 0):.1f}s
  Parse:     {timings.get('parse', 0):.1f}s
  Embed:     {timings.get('embed', 0):.1f}s
  Retrieval: {timings.get('retrieval', 0):.1f}s
  LLM:       {timings.get('llm', 0):.1f}s
  ──────────────────
  Total:     {total_time:.1f}s
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

