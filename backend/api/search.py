from fastapi import APIRouter, Depends, Query

from api.deps import get_current_user
from db.supabase_client import get_supabase_client
from models.types import SearchQuery
from providers.embeddings import get_embeddings_provider
from services.search_service import SearchService

router = APIRouter(tags=["search"])


@router.get("/search")
async def search(
    text: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    user: dict = Depends(get_current_user),  # noqa: B008
):
    """Semantic search. Auth required."""
    db = get_supabase_client()
    embeddings = get_embeddings_provider()
    service = SearchService(db=db, embeddings=embeddings)
    query = SearchQuery(text=text, limit=limit)
    results = await service.search(query)
    return [r.model_dump() for r in results]
