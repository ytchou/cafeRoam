from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Supabase
    supabase_url: str = "http://127.0.0.1:54321"
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # LLM
    llm_provider: str = "anthropic"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6-20250514"

    # Embeddings
    embeddings_provider: str = "openai"
    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-small"

    # Email
    email_provider: str = "resend"
    resend_api_key: str = ""
    email_from: str = "CafeRoam <noreply@caferoam.tw>"

    # Analytics
    analytics_provider: str = "posthog"
    posthog_api_key: str = ""
    posthog_host: str = "https://app.posthog.com"

    # Maps
    maps_provider: str = "mapbox"
    mapbox_access_token: str = ""

    # Sentry
    sentry_dsn: str = ""

    # App
    environment: str = "development"
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
