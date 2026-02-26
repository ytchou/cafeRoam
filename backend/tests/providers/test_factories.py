from unittest.mock import patch

import pytest

from providers.analytics.interface import AnalyticsProvider
from providers.email.interface import EmailProvider
from providers.embeddings.interface import EmbeddingsProvider
from providers.llm.interface import LLMProvider
from providers.maps.interface import MapsProvider


class TestProviderProtocols:
    """Verify protocol definitions exist and are importable."""

    def test_llm_provider_protocol_exists(self):
        assert hasattr(LLMProvider, "enrich_shop")
        assert hasattr(LLMProvider, "extract_menu_data")

    def test_embeddings_provider_protocol_exists(self):
        assert hasattr(EmbeddingsProvider, "embed")
        assert hasattr(EmbeddingsProvider, "embed_batch")
        assert hasattr(EmbeddingsProvider, "dimensions")
        assert hasattr(EmbeddingsProvider, "model_id")

    def test_email_provider_protocol_exists(self):
        assert hasattr(EmailProvider, "send")

    def test_analytics_provider_protocol_exists(self):
        assert hasattr(AnalyticsProvider, "track")
        assert hasattr(AnalyticsProvider, "identify")
        assert hasattr(AnalyticsProvider, "page")

    def test_maps_provider_protocol_exists(self):
        assert hasattr(MapsProvider, "geocode")
        assert hasattr(MapsProvider, "reverse_geocode")


class TestProviderFactories:
    """Verify factory functions select correct adapter from settings."""

    def test_llm_factory_returns_anthropic(self):
        with patch("providers.llm.settings") as mock:
            mock.llm_provider = "anthropic"
            mock.anthropic_api_key = "test-key"
            mock.anthropic_model = "claude-sonnet-4-6-20250514"
            from providers.llm import get_llm_provider

            provider = get_llm_provider()
            assert provider is not None

    def test_llm_factory_passes_taxonomy(self):
        from models.types import TaxonomyTag

        taxonomy = [
            TaxonomyTag(id="quiet", dimension="ambience", label="Quiet", label_zh="安靜"),
        ]
        with patch("providers.llm.settings") as mock:
            mock.llm_provider = "anthropic"
            mock.anthropic_api_key = "test-key"
            mock.anthropic_model = "claude-sonnet-4-6-20250514"
            from providers.llm import get_llm_provider

            provider = get_llm_provider(taxonomy=taxonomy)
            assert provider is not None
            assert hasattr(provider, "_taxonomy")
            assert len(provider._taxonomy) == 1

    def test_llm_factory_defaults_to_empty_taxonomy(self):
        with patch("providers.llm.settings") as mock:
            mock.llm_provider = "anthropic"
            mock.anthropic_api_key = "test-key"
            mock.anthropic_model = "claude-sonnet-4-6-20250514"
            from providers.llm import get_llm_provider

            provider = get_llm_provider()
            assert provider is not None
            assert provider._taxonomy == []

    def test_llm_factory_unknown_provider_raises(self):
        with patch("providers.llm.settings") as mock:
            mock.llm_provider = "unknown"
            from providers.llm import get_llm_provider

            with pytest.raises(ValueError, match="Unknown LLM provider"):
                get_llm_provider()

    def test_embeddings_factory_returns_openai(self):
        with patch("providers.embeddings.settings") as mock:
            mock.embeddings_provider = "openai"
            mock.openai_api_key = "test-key"
            mock.openai_embedding_model = "text-embedding-3-small"
            from providers.embeddings import get_embeddings_provider

            provider = get_embeddings_provider()
            assert provider is not None
            assert provider.dimensions == 1536

    def test_email_factory_returns_resend(self):
        with patch("providers.email.settings") as mock:
            mock.email_provider = "resend"
            mock.resend_api_key = "test-key"
            mock.email_from = "test@example.com"
            from providers.email import get_email_provider

            provider = get_email_provider()
            assert provider is not None
