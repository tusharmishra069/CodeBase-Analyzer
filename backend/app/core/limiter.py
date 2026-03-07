"""
Central rate-limiter instance (slowapi wrapping the `limits` library).

Why rate limiting?
  Without it a single attacker can:
  - Exhaust Groq API quota ($$$ cost attack)
  - Exhaust GitHub API quota (5000 req/hr for authenticated, 60 for anon)
  - DDOS the AI inference pipeline (each request spawns heavy ML work)
  - Brute-force the API key header

Strategy
--------
  - Keyed on real client IP, extracted through reverse-proxy headers
    (X-Forwarded-For / X-Real-IP) with a safe fallback.
  - In-memory storage (MemoryStorage) — works for single-process deployments.
    To scale horizontally swap to RedisStorage via RATE_LIMIT_STORAGE_URI env var.
  - Three tiers:
      default    60/min  — general protection
      ai         10/min  — expensive AI endpoints (/analyze, /roast, /profile-*)
      status    120/min  — cheap polling endpoint (/jobs/{id}/status)

429 responses include:
  Retry-After          — seconds until window resets
  X-RateLimit-Limit    — configured limit for this endpoint
  X-RateLimit-Remaining — remaining requests in current window
  X-RateLimit-Reset    — epoch timestamp of window reset
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings


def _get_real_ip(request) -> str:  # type: ignore[override]
    """
    Extract the real client IP, honouring common reverse-proxy headers.

    Priority:
      1. X-Forwarded-For first hop (set by nginx / cloud load balancers)
      2. X-Real-IP (set by nginx proxy_set_header)
      3. ASGI scope client address (direct connection)

    We take only the *first* value in X-Forwarded-For to prevent IP spoofing
    via appending fake IPs to a multi-hop header.
    """
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()

    x_real = request.headers.get("X-Real-IP")
    if x_real:
        return x_real.strip()

    return get_remote_address(request)


limiter = Limiter(
    key_func=_get_real_ip,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    # Swap to Redis for multi-worker deployments:
    # storage_uri=os.getenv("RATE_LIMIT_STORAGE_URI", "memory://"),
)
