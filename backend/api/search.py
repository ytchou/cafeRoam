from typing import Any

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from starlette.requests import Request
from supabase import Client

from api.deps import get_admin_db, get_optional_user, get_optional_user_db
from core.anonymize import anonymize_user_id
from core.config import settings
from middleware.rate_limit import get_user_id_or_ip, limiter
from models.types import SearchQuery
from providers.cache import get_search_cache_provider
from providers.embeddings import EmbeddingsProviderUnavailableError, get_embeddings_provider
from services.query_classifier import classify
from services.search_service import SearchService

logger = structlog.get_logger()
router = APIRouter(tags=["search"])


def _log_search_event(
    admin_db: Client,
    user_id_anon: str,
    query_text: str,
    query_type: str,
    mode_filter: str | None,
    result_count: int,
    cache_hit: bool = False,
) -> None:
    """Fire-and-forget: insert a row into search_events. Errors are logged, never raised."""
    try:
        admin_db.table("search_events").insert(
            {
                "user_id_anon": user_id_anon,
                "query_text": query_text,
                "query_type": query_type,
                "mode_filter": mode_filter,
                "result_count": result_count,
                "cache_hit": cache_hit,
            }
        ).execute()
    except Exception:
        logger.warning("search_event insert failed", query_type=query_type, exc_info=True)


@limiter.limit(settings.rate_limit_search, key_func=get_user_id_or_ip)
@router.get("/search")
async def search(
    request: Request,
    background_tasks: BackgroundTasks,
    text: str = Query(..., min_length=1),
    mode: str | None = Query(None, pattern="^(work|rest|social)$"),
    limit: int = Query(20, ge=1, le=50),
    user: dict[str, Any] | None = Depends(get_optional_user),  # noqa: B008
    db: Client = Depends(get_optional_user_db),  # noqa: B008
    admin_db: Client = Depends(get_admin_db),  # noqa: B008
) -> dict[str, Any]:
    """Semantic search with optional mode filter. Auth optional; unauthenticated users can search."""
    try:
        embeddings = get_embeddings_provider()
    except EmbeddingsProviderUnavailableError as exc:
        logger.error("Embeddings provider unavailable", error=str(exc))
        raise HTTPException(
            status_code=503,
            detail="Search is temporarily unavailable. The embeddings provider is not configured.",
        ) from exc

    cache = get_search_cache_provider(admin_db)
    service = SearchService(db=db, embeddings=embeddings, cache=cache)
    query = SearchQuery(text=text, limit=limit)
    query_type = classify(text)
    response = await service.search(query, mode=mode, query_type=query_type)
    user_id = user["id"] if user else "anonymous"
    user_id_anon = anonymize_user_id(user_id, salt=settings.anon_salt)
    result_count = len(response.results)

    background_tasks.add_task(
        _log_search_event,
        admin_db,
        user_id_anon,
        text,
        query_type,
        mode,
        result_count,
        response.cache_hit,
    )

    if response.cache_hit:
        return {
            "results": response.results,
            "query_type": query_type,
            "result_count": result_count,
            "cache_hit": True,
        }

    return {
        "results": [r.model_dump(by_alias=True) for r in response.results],
        "query_type": query_type,
        "result_count": result_count,
        "cache_hit": False,
    }
