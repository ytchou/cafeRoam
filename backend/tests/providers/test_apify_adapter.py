from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest

from providers.scraper.apify_adapter import ApifyScraperAdapter


@pytest.fixture
def adapter():
    return ApifyScraperAdapter(api_token="test-token")
