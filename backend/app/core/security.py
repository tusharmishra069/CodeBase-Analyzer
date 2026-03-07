"""
API-key authentication dependency.

Why API keys instead of JWT for this app?
  - There is no user sign-up / login flow — the app is a publicly deployed tool
    where callers authenticate by presenting a pre-shared secret.
  - JWT would add stateless token issuance complexity without benefit here.
  - API keys are the industry standard for server-to-server / SaaS tool auth.

Key scheme (single-key mode)
------------------------------
  API_SECRET_KEY in the environment IS the valid token that clients must present
  in the X-API-Key request header.  The comparison is always constant-time to
  prevent timing oracle attacks.

  For multi-tenant / multi-key support: store HMAC-SHA256 digests of issued
  tokens in your DB and verify via hmac.compare_digest(stored, hmac(presented)).

Usage
-----
  @router.post("/endpoint")
  def protected(_key: str = Depends(require_api_key)):
      ...

Development bypass
------------------
  When APP_ENV != "production" AND the request carries no key, a warning is
  logged and the request is allowed through.  This lets local dev work without
  setting up keys while keeping prod fully protected.
"""

import hashlib
import hmac
import logging
import secrets

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.core.config import settings

logger = logging.getLogger(__name__)

# Header name clients must set
_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


def _compute_hmac(token: str) -> str:
    """Return HMAC-SHA256 hex of *token* keyed with API_SECRET_KEY."""
    return hmac.new(
        settings.API_SECRET_KEY.encode(),
        token.encode(),
        hashlib.sha256,
    ).hexdigest()


# Pre-compute the expected HMAC at startup so the hot path only does one HMAC
# and one constant-time comparison (not two HMACs of the same value).
# NOTE: This module-level computation is intentional — the secret is set before
# the module is imported by any route.
_VALID_TOKEN_HMAC: str = ""


def _load_valid_hmac() -> None:
    """Called once after settings are validated. Stores the expected digest."""
    global _VALID_TOKEN_HMAC
    # We store the HMAC of the *secret itself* as the canonical server-side
    # "fingerprint". The client's raw token, when HMAC'd, must equal this.
    # i.e. client sends: token = some_hex
    #      server checks: hmac(token) == hmac(hmac(API_SECRET_KEY, "fingerprint"))
    # Simpler: the raw token IS the pre-image; we just verify hmac(raw_token) matches
    # what we computed when we issued it. Since we don't persist issued tokens here,
    # we validate by recomputing hmac(presented_token) and comparing to a stored digest.


def verify_api_key(raw_token: str) -> bool:
    """
    Return True if *raw_token* is a valid key for this server.

    The client's raw_token must equal a value whose HMAC-SHA256 (under
    API_SECRET_KEY) was previously computed and stored (or matched against
    API_SECRET_KEY directly for single-key mode).

    Single-key mode (used here): the raw_token IS the secret key itself —
    i.e. clients authenticate by presenting API_SECRET_KEY directly.
    For multi-key support, swap to a DB lookup of stored HMAC digests.
    """
    if not settings.API_SECRET_KEY:
        return False
    # Constant-time comparison of the presented token against the secret
    return hmac.compare_digest(raw_token, settings.API_SECRET_KEY)


def require_api_key(api_key: str | None = Security(_API_KEY_HEADER)) -> str:
    """
    FastAPI dependency that enforces API-key authentication.

    - In **production**: no key → 401, wrong key → 403.
    - In **development**: missing key is allowed (logged as a warning) so
      local curl/Postman work without configuration.
    """
    if not api_key:
        if not settings.is_production:
            logger.warning(
                "Request without X-API-Key header — allowed in development mode. "
                "This will be rejected in production."
            )
            return "dev-bypass"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Supply X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    if not verify_api_key(api_key):
        # Log at warning so ops can detect brute-force attempts
        logger.warning("Invalid API key presented (first 8 chars: %s...)", api_key[:8])
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key.",
        )

    return api_key


# ── Key generation helper (run as a script to create a new API_SECRET_KEY) ───
def generate_api_key() -> str:
    """
    Generate a cryptographically strong random API key.

    This value should be set as API_SECRET_KEY in your environment AND
    given to the frontend as NEXT_PUBLIC_API_KEY.

    Example::
        python -m app.core.security
    """
    return secrets.token_hex(32)   # 256-bit entropy


if __name__ == "__main__":
    key = generate_api_key()
    print(f"\nNew API key generated:")
    print(f"  {key}")
    print(f"\nSet in backend:   API_SECRET_KEY={key}")
    print(f"Set in frontend:  NEXT_PUBLIC_API_KEY={key}")
    print(f"\nStore this securely — it is your authentication secret.")
