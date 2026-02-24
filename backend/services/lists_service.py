from supabase import Client

from models.types import List, ListItem

MAX_LISTS_PER_USER = 3


class ListsService:
    def __init__(self, db: Client):
        self._db = db

    async def get_by_user(self, user_id: str) -> list[List]:
        response = (
            self._db.table("lists")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return [List(**row) for row in response.data]

    async def create(self, user_id: str, name: str) -> List:
        """Create a new list. Enforces max 3 lists per user at the API level."""
        existing = (
            self._db.table("lists")
            .select("id")
            .eq("user_id", user_id)
            .execute()
        )
        if len(existing.data) >= MAX_LISTS_PER_USER:
            raise ValueError(
                f"Maximum {MAX_LISTS_PER_USER} lists per user. "
                "Delete an existing list before creating a new one."
            )

        response = (
            self._db.table("lists")
            .insert({"user_id": user_id, "name": name})
            .execute()
        )
        return List(**response.data[0])

    async def delete(self, list_id: str, user_id: str) -> None:
        """Delete a list owned by the user. Also deletes all list items."""
        self._db.table("list_items").delete().eq("list_id", list_id).execute()
        self._db.table("lists").delete().eq("id", list_id).eq(
            "user_id", user_id
        ).execute()

    async def add_shop(
        self, list_id: str, shop_id: str, user_id: str
    ) -> ListItem:
        """Add a shop to a list."""
        response = (
            self._db.table("list_items")
            .insert({"list_id": list_id, "shop_id": shop_id})
            .execute()
        )
        return ListItem(**response.data[0])

    async def remove_shop(
        self, list_id: str, shop_id: str, user_id: str
    ) -> None:
        """Remove a shop from a list."""
        (
            self._db.table("list_items")
            .delete()
            .eq("list_id", list_id)
            .eq("shop_id", shop_id)
            .execute()
        )
