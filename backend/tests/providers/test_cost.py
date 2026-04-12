import pytest
from providers.cost import compute_llm_cost


def test_claude_sonnet_known_cost():
    # 1M input @ $3 + 1M output @ $15 = $18
    cost = compute_llm_cost("claude-sonnet-4-6", tokens_input=1_000_000, tokens_output=1_000_000)
    assert cost == pytest.approx(18.0)


def test_cache_write_and_read_tokens_included():
    # cache_write 1M @ $3.75 + cache_read 1M @ $0.30 = $4.05
    cost = compute_llm_cost(
        "claude-sonnet-4-6",
        tokens_input=0,
        tokens_output=0,
        tokens_cache_write=1_000_000,
        tokens_cache_read=1_000_000,
    )
    assert cost == pytest.approx(4.05)


def test_unknown_model_returns_zero():
    cost = compute_llm_cost("gpt-99-turbo-ultra", tokens_input=500_000, tokens_output=200_000)
    assert cost == 0.0


def test_embedding_model_output_is_free():
    cost = compute_llm_cost("text-embedding-3-small", tokens_input=1_000_000, tokens_output=0)
    assert cost == pytest.approx(0.02)


def test_zero_tokens_returns_zero():
    cost = compute_llm_cost("gpt-4o-mini", tokens_input=0, tokens_output=0)
    assert cost == 0.0


def test_gpt4o_mini_cost():
    # 1M input @ $0.15 + 1M output @ $0.60 = $0.75
    cost = compute_llm_cost("gpt-4o-mini", tokens_input=1_000_000, tokens_output=1_000_000)
    assert cost == pytest.approx(0.75)
