from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = "super-secret-jwt-token-with-at-least-32-characters-long"

    # LLM
    llm_provider: str = "anthropic"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    anthropic_classify_model: str = "claude-haiku-4-5-20251001"
    openai_llm_model: str = "gpt-5.4"
    openai_llm_classify_model: str = "gpt-5.4-mini"
    openai_llm_nano_model: str = "gpt-5.4-nano"

    # Embeddings
    embeddings_provider: str = "openai"
    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-small"

    # Email
    email_provider: str = "resend"
    resend_api_key: str = ""
    email_from: str = "CafeRoam <noreply@caferoam.tw>"
    admin_email: str = "hello@caferoam.tw"

    # Issue tracker (Linear)
    issue_tracker_provider: str = "linear"
    linear_api_key: str = ""
    linear_team_id: str = ""

    # Analytics
    analytics_provider: str = "posthog"
    posthog_api_key: str = ""
    posthog_host: str = "https://app.posthog.com"
    posthog_project_id: str | None = None

    # Maps
    maps_provider: str = "mapbox"
    mapbox_access_token: str = ""

    # Scraper
    scraper_provider: str = "apify"
    apify_api_token: str = ""

    # Sentry
    sentry_dsn: str = ""

    # App
    environment: str = "development"
    log_level: str = "INFO"
    site_url: str = "http://localhost:3000"

    # Admin
    admin_user_ids: list[str] = []

    # Anonymization
    anon_salt: str = "caferoam-dev-salt"

    # Worker concurrency
    worker_poll_interval_seconds: int = 300
    worker_concurrency_enrich: int = 3
    worker_concurrency_embed: int = 20
    worker_concurrency_publish: int = 20
    worker_concurrency_scrape: int = 1
    worker_concurrency_default: int = 1
    # Stuck job reaper
    worker_stuck_job_timeout_minutes: int = 10

    # Search cache
    search_cache_provider: str = "supabase"
    search_cache_ttl_seconds: int = 14400  # 4 hours
    search_cache_similarity_threshold: float = 0.85

    # Anti-crawling / rate limiting
    rate_limit_default: str = "60/minute"
    rate_limit_search: str = "10/minute"
    rate_limit_shops_list: str = "30/minute"
    rate_limit_shop_report: str = "5/day"
    bot_detection_enabled: bool = True
    bot_ua_blocklist: list[str] = [
        "curl",
        "wget",
        "python-requests",
        "python-urllib",
        "scrapy",
        "Go-http-client",
        "Java/",
        "libwww-perl",
        "PHP/",
        "Apache-HttpClient",
        "node-fetch",
        "axios",
        "httpclient",
        "okhttp",
    ]
    bot_ua_allowlist: list[str] = [
        "Googlebot",
        "Bingbot",
        "Slurp",
        "DuckDuckBot",
        "facebookexternalhit",
        "Twitterbot",
        "LinkedInBot",
    ]

    @model_validator(mode="after")
    def check_production_salt(self) -> "Settings":
        if self.environment != "development" and self.anon_salt == "caferoam-dev-salt":
            raise ValueError(
                "ANON_SALT must be changed from the development default"
                " in non-development environments"
            )
        return self

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
