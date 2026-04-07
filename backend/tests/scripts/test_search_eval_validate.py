"""Tests for --validate mode logic in run_search_eval.py."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# The functions we'll add to run_search_eval.py
from scripts.run_search_eval import (
    load_maps_baseline,
    compare_query_scores,
    generate_validation_report,
)


class TestLoadMapsBaseline:
    def test_loads_valid_baseline(self, tmp_path: Path) -> None:
        baseline = [
            {
                "id": "q1",
                "query": "test query",
                "category": "attribute",
                "maps_results": [
                    {"rank": 1, "name": "Cafe A", "relevance_score": 4, "notes": "good"},
                ],
                "maps_avg_score": 4.0,
            }
        ]
        f = tmp_path / "baseline.json"
        f.write_text(json.dumps(baseline))
        result = load_maps_baseline(f)
        assert result["q1"]["maps_avg_score"] == 4.0

    def test_raises_on_missing_file(self, tmp_path: Path) -> None:
        with pytest.raises(FileNotFoundError):
            load_maps_baseline(tmp_path / "nonexistent.json")


class TestCompareQueryScores:
    def test_caferoam_wins_when_higher(self) -> None:
        result = compare_query_scores(
            caferoam_avg=4.0, maps_avg=2.5, caferoam_scores=[2, 2, 1, 1, 0]
        )
        assert result["winner"] == "caferoam"

    def test_maps_wins_when_higher(self) -> None:
        result = compare_query_scores(
            caferoam_avg=1.0, maps_avg=4.0, caferoam_scores=[0, 0, 1, 0, 0]
        )
        assert result["winner"] == "maps"

    def test_tie_when_equal(self) -> None:
        result = compare_query_scores(
            caferoam_avg=3.0, maps_avg=3.0, caferoam_scores=[1, 1, 1, 1, 0]
        )
        assert result["winner"] == "tie"


class TestGenerateValidationReport:
    def test_pass_verdict_when_threshold_met(self) -> None:
        query_results = []
        # 8 caferoam wins, 2 maps wins -> 8/10 > 7/10 -> PASS
        for i in range(8):
            query_results.append({
                "id": f"q{i+1}",
                "query": f"query {i+1}",
                "category": "attribute",
                "caferoam_avg": 4.0,
                "maps_avg": 2.0,
                "winner": "caferoam",
                "caferoam_normalized": 3.0,
                "caferoam_scores": [2, 2, 1, 1, 0],
                "ndcg5": 0.8,
                "mrr": 1.0,
            })
        for i in range(2):
            query_results.append({
                "id": f"q{i+9}",
                "query": f"query {i+9}",
                "category": "mode",
                "caferoam_avg": 1.0,
                "maps_avg": 4.0,
                "winner": "maps",
                "caferoam_normalized": 1.0,
                "caferoam_scores": [0, 0, 1, 0, 0],
                "ndcg5": 0.2,
                "mrr": 0.0,
            })
        report = generate_validation_report(
            query_results=query_results,
            total_shops=75,
            mean_ndcg5=0.68,
            mean_mrr=0.8,
            pass_rate=80.0,
        )
        assert "PASS" in report
        assert "8/10" in report

    def test_fail_verdict_when_below_threshold(self) -> None:
        query_results = []
        # 3 caferoam wins, 7 maps wins -> 3/10 < 7/10 -> FAIL
        for i in range(3):
            query_results.append({
                "id": f"q{i+1}",
                "query": f"query {i+1}",
                "category": "attribute",
                "caferoam_avg": 4.0,
                "maps_avg": 2.0,
                "winner": "caferoam",
                "caferoam_normalized": 3.0,
                "caferoam_scores": [2, 2, 1, 1, 0],
                "ndcg5": 0.8,
                "mrr": 1.0,
            })
        for i in range(7):
            query_results.append({
                "id": f"q{i+4}",
                "query": f"query {i+4}",
                "category": "mode",
                "caferoam_avg": 1.0,
                "maps_avg": 4.0,
                "winner": "maps",
                "caferoam_normalized": 1.0,
                "caferoam_scores": [0, 0, 1, 0, 0],
                "ndcg5": 0.2,
                "mrr": 0.0,
            })
        report = generate_validation_report(
            query_results=query_results,
            total_shops=75,
            mean_ndcg5=0.38,
            mean_mrr=0.3,
            pass_rate=30.0,
        )
        assert "FAIL" in report
        assert "3/10" in report
