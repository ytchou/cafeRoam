"""Smoke test for the eval script: verify it can compute pass/fail gates from a fake result set."""
from scripts.eval_openai_routing import EvalResult, evaluate_hard_gates


def test_evaluate_hard_gates_passes_when_thresholds_met():
    results = EvalResult(
        summarize_zh_pass_rate=0.96,
        classify_photo_agreement=0.92,
        extract_menu_item_recall=0.88,
        tarot_whitelist_rate=1.0,
    )
    passed, failures = evaluate_hard_gates(results)
    assert passed is True
    assert failures == []


def test_evaluate_hard_gates_fails_on_any_gate_below_threshold():
    results = EvalResult(
        summarize_zh_pass_rate=0.90,  # below 0.95
        classify_photo_agreement=0.92,
        extract_menu_item_recall=0.88,
        tarot_whitelist_rate=1.0,
    )
    passed, failures = evaluate_hard_gates(results)
    assert passed is False
    assert any("summarize" in f for f in failures)


def test_evaluate_hard_gates_fails_on_tarot_whitelist_below_100():
    results = EvalResult(
        summarize_zh_pass_rate=0.96,
        classify_photo_agreement=0.92,
        extract_menu_item_recall=0.88,
        tarot_whitelist_rate=0.99,
    )
    passed, failures = evaluate_hard_gates(results)
    assert passed is False
