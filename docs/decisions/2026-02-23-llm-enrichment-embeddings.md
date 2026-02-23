# ADR: Claude Haiku for Enrichment, OpenAI text-embedding-3-small for Embeddings

Date: 2026-02-23

## Decision

Use Claude Haiku (Anthropic) for data enrichment (taxonomy tagging from reviews) and OpenAI text-embedding-3-small for generating vector embeddings. These are two distinct LLM jobs with different optimal providers.

## Context

CafeRoam has two separate LLM requirements: (1) **Enrichment** — reading raw Google Maps reviews and extracting structured attributes mapped to the taxonomy (e.g., `ambience:quiet`, `offering:basque_cake`). This requires strong instruction-following with constrained output. (2) **Embeddings** — converting shop descriptions and user queries into vectors for pgvector similarity search. This is pure vector math with no reasoning.

The founder has personal subscriptions to both Anthropic and Gemini. A separate service account will be created for CafeRoam.

## Alternatives Considered

- **GPT-4o for enrichment**: Capable, but Claude Haiku outperforms on constrained structured extraction tasks (choosing from a predefined list) at a comparable cost tier. OpenAI also charges for the embedding API separately, creating two OpenAI accounts to manage.
- **Gemini for enrichment**: Google text-embedding-004 is free with the Gemini API. Gemini Flash is a strong candidate for enrichment. Retained as the preferred fallback — if Claude Haiku underperforms or Anthropic pricing changes, Gemini Flash + text-embedding-004 is a viable all-Google alternative.
- **Single provider for both**: Using OpenAI for enrichment + embeddings (or Anthropic for both). Rejected for Anthropic: Anthropic does not offer standalone embedding models. Rejected for OpenAI-only: Claude Haiku's structured extraction quality justifies the split.

## Rationale

**Claude Haiku for enrichment:** Structured extraction with constrained output (taxonomy mapping) is a task where Claude consistently outperforms peers. When prompted to "classify from this list of 80 tags," Claude produces cleaner output with fewer hallucinations than GPT-4o. Fast (low latency for batch processing), cheap (~$0.25/MTok input, $1.25/MTok output). Founder has existing Anthropic familiarity.

**OpenAI text-embedding-3-small for embeddings:** At ~$0.02/1M tokens, it's among the cheapest high-quality embedding models available. Best-in-class pgvector ecosystem support (most documentation, examples, and tooling target OpenAI embeddings). Anthropic does not offer standalone embeddings. Google text-embedding-004 is the designated fallback.

Both providers are abstracted (ILLMProvider, IEmbeddingsProvider) — swapping either requires only a new adapter and env var change.

## Consequences

- Advantage: Best-fit model for each job type — enrichment quality and embedding quality both optimized
- Advantage: Both providers are abstracted — can swap independently
- Advantage: Fallback path documented: Gemini Flash (enrichment) + Google text-embedding-004 (embeddings) requires only adding two new adapters
- Disadvantage: Two API accounts to manage (Anthropic + OpenAI)
- Disadvantage: Two billing surfaces to monitor
- Locked into: The adapter interfaces, which are provider-agnostic by design
