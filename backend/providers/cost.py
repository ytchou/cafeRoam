from dataclasses import dataclass


@dataclass(frozen=True)
class ModelPricing:
    input_per_1m: float
    output_per_1m: float
    cache_write_per_1m: float = 0.0
    cache_read_per_1m: float = 0.0


LLM_PRICING: dict[str, ModelPricing] = {
    "claude-sonnet-4-6": ModelPricing(
        input_per_1m=3.0,
        output_per_1m=15.0,
        cache_write_per_1m=3.75,
        cache_read_per_1m=0.30,
    ),
    "claude-haiku-4-5-20251001": ModelPricing(
        input_per_1m=0.80,
        output_per_1m=4.0,
        cache_write_per_1m=1.0,
        cache_read_per_1m=0.08,
    ),
    "gpt-4o": ModelPricing(input_per_1m=2.50, output_per_1m=10.0),
    "gpt-4o-mini": ModelPricing(input_per_1m=0.15, output_per_1m=0.60),
    "gpt-4.1": ModelPricing(input_per_1m=2.0, output_per_1m=8.0),
    "gpt-4.1-mini": ModelPricing(input_per_1m=0.40, output_per_1m=1.60),
    "gpt-4.1-nano": ModelPricing(input_per_1m=0.10, output_per_1m=0.40),
    "text-embedding-3-small": ModelPricing(input_per_1m=0.02, output_per_1m=0.0),
    "text-embedding-3-large": ModelPricing(input_per_1m=0.13, output_per_1m=0.0),
}


def compute_llm_cost(
    model: str,
    tokens_input: int,
    tokens_output: int,
    tokens_cache_write: int = 0,
    tokens_cache_read: int = 0,
) -> float:
    """Return estimated cost in USD for a single LLM API call."""
    pricing = LLM_PRICING.get(model)
    if pricing is None:
        return 0.0

    return (
        tokens_input * pricing.input_per_1m
        + tokens_output * pricing.output_per_1m
        + tokens_cache_write * pricing.cache_write_per_1m
        + tokens_cache_read * pricing.cache_read_per_1m
    ) / 1_000_000
