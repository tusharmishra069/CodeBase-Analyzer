"""Gunicorn production configuration — Render compatible."""
import os

# ── Binding ───────────────────────────────────────────────────────────────────
# Render injects PORT=10000 by default — must match or health checks fail
port = os.environ.get("PORT", "10000")
bind = f"0.0.0.0:{port}"

# ── Workers ───────────────────────────────────────────────────────────────────
# FREE TIER (512 MB): 1 worker only—each UvicornWorker loads torch+sentence-
# transformers (~300 MB). 2 workers = instant OOM on Render free tier.
workers = 1
worker_class = "uvicorn.workers.UvicornWorker"
threads = 1

# ── Memory optimisations ─────────────────────────────────────────────────────────
# preload_app loads heavy libs once before forking workers (saves RAM)
preload_app = True
# Recycle worker after N requests to prevent slow memory leaks
max_requests = 200
max_requests_jitter = 40
worker_tmp_dir = "/tmp"

# ── Timeouts ─────────────────────────────────────────────────────────────────
# AI analysis can take up to 3 min on large repos
timeout = 300
graceful_timeout = 60
keepalive = 5

# ── Logging ───────────────────────────────────────────────────────────────────
# Use "info" so Render dashboard shows request logs
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s "%(r)s" %(s)s %(b)s %(D)sµs'

# ── Render: trust X-Forwarded-For from Render's proxy ─────────────────────────
forwarded_allow_ips = "*"

# ── Process naming ─────────────────────────────────────────────────────────────
proc_name = "codebase-analyzer"

# ── Security ──────────────────────────────────────────────────────────────────
limit_request_line = 8190
limit_request_fields = 100
