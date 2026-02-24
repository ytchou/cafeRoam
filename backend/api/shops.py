from fastapi import APIRouter

from db.supabase_client import get_supabase_client

router = APIRouter(prefix="/shops", tags=["shops"])


@router.get("/")
async def list_shops(city: str | None = None):
    """List shops. Public — no auth required."""
    db = get_supabase_client()
    query = db.table("shops").select("*")
    if city:
        query = query.eq("city", city)
    response = query.execute()
    return response.data


@router.get("/{shop_id}")
async def get_shop(shop_id: str):
    """Get a single shop by ID. Public — no auth required."""
    db = get_supabase_client()
    response = db.table("shops").select("*").eq("id", shop_id).single().execute()
    return response.data
