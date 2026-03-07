import logging
from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.limiter import limiter
from app.core.security import require_api_key
from app.core.config import settings
from app.schemas.profile import (
    ProfileRequest,
    RoastResponse,
    ProfileReviewResponse,
    AiSuggestionsResponse,
)
from app.services.github_service import fetch_github_profile
from app.services.roast_generator import RoastGenerator
from app.services.profile_review_generator import ProfileReviewGenerator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Profile"])


def _get_profile(username: str) -> dict:
    """Shared helper — fetches GitHub profile or raises HTTP 404/500."""
    try:
        return fetch_github_profile(username)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"GitHub fetch error for '{username}': {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch GitHub profile.")


@router.post("/roast", response_model=RoastResponse)
@limiter.limit(settings.RATE_LIMIT_AI)
def handle_roast(
    request: Request,
    req: ProfileRequest,
    _key: str = Depends(require_api_key),
):
    """Generate a brutal comedy roast for a GitHub profile."""
    profile_data = _get_profile(req.username)

    try:
        roast_data = RoastGenerator().generate_roast(profile_data)
    except Exception as e:
        logger.error(f"Roast generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate roast: {e}")

    return RoastResponse(
        username=profile_data["username"],
        avatar_url=profile_data.get("avatar_url"),
        stats={
            "followers": profile_data.get("followers", 0),
            "public_repos": profile_data.get("public_repos_count", 0),
            "total_stars": profile_data.get("total_stars", 0),
            "top_language": profile_data.get("top_language", "None"),
        },
        roast=roast_data,
    )


@router.post("/profile-review", response_model=ProfileReviewResponse)
@limiter.limit(settings.RATE_LIMIT_AI)
def handle_profile_review(
    request: Request,
    req: ProfileRequest,
    _key: str = Depends(require_api_key),
):
    """Generate a structured, professional review for a GitHub profile."""
    profile_data = _get_profile(req.username)

    try:
        review_data = ProfileReviewGenerator().generate_review(profile_data)
    except Exception as e:
        logger.error(f"Review generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate review: {e}")

    return ProfileReviewResponse(
        username=profile_data["username"],
        avatar_url=profile_data.get("avatar_url"),
        stats={
            "followers": profile_data.get("followers", 0),
            "public_repos": profile_data.get("public_repos_count", 0),
            "total_stars": profile_data.get("total_stars", 0),
            "top_language": profile_data.get("top_language", "None"),
            "language_breakdown": profile_data.get("language_breakdown", {}),
        },
        review=review_data,
    )


@router.post("/profile-suggestions", response_model=AiSuggestionsResponse)
@limiter.limit(settings.RATE_LIMIT_AI)
def handle_profile_suggestions(
    request: Request,
    req: ProfileRequest,
    _key: str = Depends(require_api_key),
):
    """Generate 5 targeted AI improvement suggestions for a GitHub profile."""
    profile_data = _get_profile(req.username)

    try:
        suggestions = ProfileReviewGenerator().generate_ai_suggestions(profile_data)
    except Exception as e:
        logger.error(f"AI suggestions error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {e}")

    return AiSuggestionsResponse(
        username=profile_data["username"],
        suggestions=suggestions,
    )
