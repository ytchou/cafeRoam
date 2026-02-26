# Design: Provider Adapter Implementations

Date: 2026-02-26
Status: Approved
Phase: Phase 1 — Foundation (Provider Abstractions)

## Overview

Implement the 3 remaining stubbed provider adapters: LLM (Anthropic), Maps (Mapbox), Analytics (PostHog). The provider abstraction layer (protocols, factories, directory structure) is already complete. This design covers the concrete adapter implementations.

### Current State

| Provider      | Interface | Adapter       | Factory | Status              |
| ------------- | --------- | ------------- | ------- | ------------------- |
| Embeddings    | Done      | Done (OpenAI) | Done    | Production          |
| Email         | Done      | Done (Resend) | Done    | Production          |
| **LLM**       | Done      | **Stubbed**   | Done    | NotImplementedError |
| **Maps**      | Done      | **Stubbed**   | Done    | NotImplementedError |
| **Analytics** | Done      | **Stubbed**   | Done    | pass (no-op)        |

### Decision Summary

| Decision          | Choice                    | Rationale                                                                    |
| ----------------- | ------------------------- | ---------------------------------------------------------------------------- |
| LLM model         | Sonnet (per ADR)          | Quality gap vs Haiku is proven; config already defaults to claude-sonnet-4-6 |
| enrich_shop input | ShopEnrichmentInput model | Cleaner than expanding params; easy to extend                                |
| Taxonomy source   | Injected via constructor  | Keeps adapter pure; caller loads from DB/file                                |
| Menu extraction   | URL-based vision          | Direct Supabase signed URL to Claude; no download step                       |
| Maps HTTP client  | httpx REST calls          | No extra SDK dependency; testable                                            |
| PostHog init      | Eager (constructor)       | Fail fast; predictable                                                       |

---

## 1. LLM Provider — Anthropic Adapter

### 1.1 Interface Changes

**New input model** (`backend/models/types.py`):

```python
class ShopEnrichmentInput(BaseModel):
    name: str
    reviews: list[str]
    description: str | None = None
    categories: list[str] = []
    price_range: str | None = None
    socket: str | None = None       # "yes" / "no" / "maybe"
    limited_time: str | None = None  # "yes" / "no" / "maybe"
    rating: float | None = None
    review_count: int | None = None
```

**Updated protocol** (`backend/providers/llm/interface.py`):

```python
class LLMProvider(Protocol):
    async def enrich_shop(self, shop: ShopEnrichmentInput) -> EnrichmentResult: ...
    async def extract_menu_data(self, image_url: str) -> MenuExtractionResult: ...
```

### 1.2 Constructor

```python
class AnthropicLLMAdapter:
    def __init__(self, api_key: str, model: str, taxonomy: list[TaxonomyTag]):
        self._client = AsyncAnthropic(api_key=api_key)
        self._model = model
        self._taxonomy = taxonomy
        self._taxonomy_by_id = {tag.id: tag for tag in taxonomy}
```

Taxonomy is injected at construction. The factory or caller loads it from DB or file.

### 1.3 enrich_shop Implementation

**Flow:**

1. Build system prompt — expert classifier with rules (only taxonomy tags, confidence 0-1, 2-3 sentence summary, classify mode)
2. Build user prompt — shop name, categories, price_range, socket, limited_time, rating, review_count, description, formatted reviews, full taxonomy listing
3. Call Claude with forced tool use: `classify_shop` tool (same schema as TypeScript pipeline)
4. Extract tool use result from response
5. Validate: filter tags to taxonomy-only, clamp confidence to [0, 1], default invalid mode to "mixed"
6. Map to EnrichmentResult: resolve tag IDs to full TaxonomyTag objects, compute overall confidence as avg of tag confidences, map mode string to ShopModeScores

**Tool schema** (`classify_shop`):

```json
{
  "name": "classify_shop",
  "description": "Classify a coffee shop based on its reviews using the provided taxonomy",
  "input_schema": {
    "type": "object",
    "properties": {
      "tags": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "confidence": { "type": "number" }
          },
          "required": ["id", "confidence"]
        }
      },
      "summary": { "type": "string" },
      "topReviews": {
        "type": "array",
        "items": { "type": "string" }
      },
      "mode": {
        "type": "string",
        "enum": ["work", "rest", "social", "mixed"]
      }
    },
    "required": ["tags", "summary", "topReviews", "mode"]
  }
}
```

**Mode-to-scores mapping:**

| Mode string | ShopModeScores                 |
| ----------- | ------------------------------ |
| "work"      | work=1.0, rest=0.0, social=0.0 |
| "rest"      | work=0.0, rest=1.0, social=0.0 |
| "social"    | work=0.0, rest=0.0, social=1.0 |
| "mixed"     | work=0.5, rest=0.5, social=0.5 |

Note: Pass 3c post-processing later refines these with tag-signal-based multi-mode inference.

### 1.4 extract_menu_data Implementation

**Flow:**

1. Build prompt: "Extract all menu items from this coffee shop menu photo. Return structured data."
2. Call Claude vision API with image URL in the message content (URL source type)
3. Forced tool use: `extract_menu` tool returning `{items: [{name, price, description?, category?}], raw_text}`
4. Return `MenuExtractionResult`

**Tool schema** (`extract_menu`):

```json
{
  "name": "extract_menu",
  "description": "Extract structured menu items from a coffee shop menu image",
  "input_schema": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "price": { "type": "number" },
            "description": { "type": "string" },
            "category": { "type": "string" }
          },
          "required": ["name"]
        }
      },
      "raw_text": { "type": "string" }
    },
    "required": ["items"]
  }
}
```

### 1.5 Error Handling

- **API errors** (rate limit, auth, network): Raise — let the caller (worker handler) decide retry strategy via existing job queue retry with exponential backoff.
- **Invalid tool use response** (no tool_use block, malformed JSON): Raise `ValueError` with descriptive message.
- **Invalid tags** (not in taxonomy): Silently filter out. Log warning.
- **Missing/invalid mode**: Default to "mixed".
- **Confidence out of range**: Clamp to [0.0, 1.0].

### 1.6 Factory Update

The factory needs taxonomy. Two options for the caller:

```python
# Option A: Factory loads taxonomy from a known source
def get_llm_provider(taxonomy: list[TaxonomyTag] | None = None) -> LLMProvider:
    match settings.llm_provider:
        case "anthropic":
            return AnthropicLLMAdapter(
                api_key=settings.anthropic_api_key,
                model=settings.anthropic_model,
                taxonomy=taxonomy or [],
            )
```

The worker handler loads taxonomy from DB and passes it through. Empty taxonomy is valid (adapter will produce no tags) for cases like menu extraction that don't need taxonomy.

---

## 2. Maps Provider — Mapbox Adapter

### 2.1 Implementation

```python
class MapboxMapsAdapter:
    BASE_URL = "https://api.mapbox.com/search/geocode/v6"

    def __init__(self, access_token: str):
        self._token = access_token
        self._client = httpx.AsyncClient(timeout=10.0)
```

### 2.2 geocode

```
GET {BASE_URL}/forward?q={address}&access_token={token}&country=TW&language=zh&limit=1
```

1. URL-encode the address
2. Parse GeoJSON response: `features[0].geometry.coordinates` (lon, lat) + `features[0].properties.full_address`
3. Return `GeocodingResult(latitude, longitude, formatted_address)` or `None` if no features

### 2.3 reverse_geocode

```
GET {BASE_URL}/reverse?longitude={lng}&latitude={lat}&access_token={token}&language=zh&limit=1
```

1. Parse GeoJSON response: `features[0].properties.full_address`
2. Return address string or `None`

### 2.4 Error Handling

- **HTTP errors / timeouts**: Return `None`. Log warning.
- **Empty results**: Return `None`.
- **Rationale**: SPEC says map view degrades gracefully to list view. Geocoding failures should never crash the app.

### 2.5 Resource Cleanup

Expose an `async def close()` method to shut down the httpx client. Called during app shutdown.

---

## 3. Analytics Provider — PostHog Adapter

### 3.1 Implementation

```python
import posthog

class PostHogAnalyticsAdapter:
    def __init__(self, api_key: str, host: str):
        self._posthog = posthog
        self._posthog.project_api_key = api_key
        self._posthog.host = host
        self._posthog.debug = False
        self._posthog.on_error = self._on_error

    def track(self, event, properties=None) -> None:
        self._posthog.capture(
            distinct_id="server",
            event=event,
            properties=properties,
        )

    def identify(self, user_id, traits=None) -> None:
        self._posthog.identify(
            distinct_id=user_id,
            properties=traits,
        )

    def page(self, name=None, properties=None) -> None:
        self._posthog.capture(
            distinct_id="server",
            event="$pageview",
            properties={"$current_url": name, **(properties or {})},
        )

    @staticmethod
    def _on_error(error, items):
        logger.warning(f"PostHog error: {error}")
```

### 3.2 Key Decisions

- **Module-level config**: Official recommended pattern for `posthog-python`
- **`distinct_id="server"`**: Backend events use a fixed ID. Frontend tracks with real (anonymized) user IDs via PostHog JS SDK.
- **Silent errors**: Analytics must never crash the app. Errors logged as warnings.
- **`page()` mapping**: Maps to PostHog `$pageview` event. Rarely used from backend but protocol requires it.

---

## 4. Files Changed Summary

### New Files

- `backend/tests/providers/test_anthropic_adapter.py`
- `backend/tests/providers/test_mapbox_adapter.py`
- `backend/tests/providers/test_posthog_adapter.py`

### Modified Files

- `backend/models/types.py` — add `ShopEnrichmentInput`
- `backend/providers/llm/interface.py` — update `enrich_shop` signature
- `backend/providers/llm/anthropic_adapter.py` — full implementation
- `backend/providers/llm/__init__.py` — update factory for taxonomy param
- `backend/providers/maps/mapbox_adapter.py` — full implementation
- `backend/providers/analytics/posthog_adapter.py` — full implementation
- `backend/tests/providers/test_factories.py` — add Maps + Analytics factory tests
- `backend/workers/handlers/` — update callers of `enrich_shop` for new signature

---

## 5. Testing Strategy

| Adapter       | Test approach            | Key test cases                                                                                                                                                                                                                               |
| ------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Anthropic** | Mock `AsyncAnthropic`    | Prompt includes all shop data; prompt includes taxonomy; valid tool use parsed correctly; invalid tags filtered; missing mode defaults to "mixed"; confidence clamped; API error propagates; vision URL passed correctly for menu extraction |
| **Mapbox**    | Mock `httpx.AsyncClient` | Successful geocode returns result; empty results return None; HTTP error returns None; timeout returns None; reverse geocode parses address                                                                                                  |
| **PostHog**   | Mock `posthog` module    | track() calls capture(); identify() calls identify(); page() maps to $pageview; errors don't propagate                                                                                                                                       |
| **Factories** | Mock settings            | Maps factory returns MapboxMapsAdapter; Analytics factory returns PostHogAnalyticsAdapter; unknown provider raises ValueError                                                                                                                |

---

## 6. Dependencies

| Package     | Already in deps?        | Needed for        |
| ----------- | ----------------------- | ----------------- |
| `anthropic` | Yes                     | LLM adapter       |
| `httpx`     | Yes (FastAPI dep)       | Maps adapter      |
| `posthog`   | Yes (in pyproject.toml) | Analytics adapter |

No new dependencies required.

---

## 7. SPEC Update Needed

SPEC.md references "Claude Haiku" for enrichment, but the ADR and config default to Sonnet. After implementation, update SPEC.md to say "Claude Sonnet" and add a SPEC_CHANGELOG entry.
