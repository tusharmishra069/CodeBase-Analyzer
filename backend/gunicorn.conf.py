"""Gunicorn production configuration."""
import multiprocessing

# ── Binding ───────────────────────────────────────────────────────────────────
bind = "0.0.0.0:8000"

# ── Workers ───────────────────────────────────────────────────────────────────
# For CPU-bound AI workloads keep workers low; async handles I/O concurrency
workers = 2
worker_class = "uvicorn.workers.UvicornWorker"
threads = 1

# ── Timeouts ─────────────────────────────────────────────────────────────────
# AI analysis can take up to 3 min on large repos
timeout = 300
graceful_timeout = 60
keepalive = 5

# ── Logging ───────────────────────────────────────────────────────────────────
accesslog = "-"
errorlog = "-"
loglevel = "warning"
access_log_format = '%(h)s "%(r)s" %(s)s %(b)s %(D)sµs'

# ── Process naming ─────────────────────────────────────────────────────────────
proc_name = "ai-code-analyzer"

# ── Security ──────────────────────────────────────────────────────────────────
limit_request_line = 8190
limit_request_fields = 100
