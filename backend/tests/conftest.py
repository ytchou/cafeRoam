from unittest.mock import AsyncMock, MagicMock

import pytest


@pytest.fixture
def mock_supabase():
    """Mock Supabase client for testing."""
    client = MagicMock()
    client.table = MagicMock(return_value=client)
    client.select = MagicMock(return_value=client)
    client.insert = MagicMock(return_value=client)
    client.update = MagicMock(return_value=client)
    client.delete = MagicMock(return_value=client)
    client.eq = MagicMock(return_value=client)
    client.execute = AsyncMock(return_value=MagicMock(data=[], count=0))
    return client
