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
    def test_returns_entries_keyed_by_query_id(self, tmp_path: Path) -> None:
        baseline = [
            {
                "id": "q1",
                "query": "有插座可以工作的安靜咖啡廳",
                "category": "attribute",
                "maps_results": [
                    {
                        "rank": 1,
                        "name": "齊文藝室共享辦公咖啡廳-The Singularity Co-Working Cafe",
                        "relevance_score": 4,
                        "notes": "Co-working cafe with outlets",
                    },
                ],
                "maps_avg_score": 4.0,
            }
        ]
        f = tmp_path / "baseline.json"
        f.write_text(json.dumps(baseline))
        result = load_maps_baseline(f)
        assert result["q1"]["maps_avg_score"] == 4.0

    def test_raises_when_baseline_file_does_not_exist(self, tmp_path: Path) -> None:
        with pytest.raises(FileNotFoundError):
            load_maps_baseline(tmp_path / "nonexistent.json")


class TestCompareQueryScores:
    def test_caferoam_beats_maps_when_normalized_score_is_higher(self) -> None:
        # caferoam scores [2,2,1,1,0] normalize to avg 4.0 on 1-5 scale vs maps 2.5
        result = compare_query_scores(maps_avg=2.5, caferoam_scores=[2, 2, 1, 1, 0])
        assert result["winner"] == "caferoam"

    def test_maps_beats_caferoam_when_maps_score_is_higher(self) -> None:
        # caferoam scores [0,0,1,0,0] normalize to avg 1.4 on 1-5 scale vs maps 4.0
        result = compare_query_scores(maps_avg=4.0, caferoam_scores=[0, 0, 1, 0, 0])
        assert result["winner"] == "maps"

    def test_result_is_a_tie_when_scores_are_within_threshold(self) -> None:
        # caferoam scores [1,1,1,1,0] normalize to avg 3.0 on 1-5 scale vs maps 3.0
        result = compare_query_scores(maps_avg=3.0, caferoam_scores=[1, 1, 1, 1, 0])
        assert result["winner"] == "tie"


_ATTRIBUTE_QUERIES = [
    "有插座可以工作的安靜咖啡廳",
    "不限時可以久坐的咖啡廳",
    "有包廂或隔間的咖啡廳",
    "有戶外座位的咖啡廳",
    "有插座不限時",
    "寵物友善",
    "有自然光落地窗的咖啡廳",
    "有巴斯克蛋糕的咖啡廳",
]
_MODE_QUERIES = [
    "適合讀書準備考試的咖啡廳",
    "適合約會的咖啡廳",
]


class TestGenerateValidationReport:
    def test_report_shows_pass_when_caferoam_wins_most_queries(self) -> None:
        # 8 caferoam wins (attribute queries), 2 maps wins (mode queries) -> 8/10 > 7/10 -> PASS
        query_results = [
            {
                "id": f"q{i + 1}",
                "query": _ATTRIBUTE_QUERIES[i],
                "category": "attribute",
                "caferoam_avg": 4.0,
                "maps_avg": 2.0,
                "winner": "caferoam",
                "caferoam_normalized": 4.0,
                "caferoam_scores": [2, 2, 1, 1, 0],
                "ndcg5": 0.8,
                "mrr": 1.0,
            }
            for i in range(8)
        ] + [
            {
                "id": f"q{i + 9}",
                "query": _MODE_QUERIES[i],
                "category": "mode",
                "caferoam_avg": 1.0,
                "maps_avg": 4.0,
                "winner": "maps",
                "caferoam_normalized": 1.4,
                "caferoam_scores": [0, 0, 1, 0, 0],
                "ndcg5": 0.2,
                "mrr": 0.0,
            }
            for i in range(2)
        ]
        report = generate_validation_report(
            query_results=query_results,
            total_shops=75,
            mean_ndcg5=0.68,
            mean_mrr=0.8,
            pass_rate=80.0,
        )
        assert "PASS" in report
        assert "8/10" in report

    def test_report_shows_fail_when_maps_wins_most_queries(self) -> None:
        # 3 caferoam wins, 7 maps wins -> 3/10 < 7/10 -> FAIL
        attribute_queries_subset = _ATTRIBUTE_QUERIES[:3]
        mode_queries_extended = [
            "適合讀書準備考試的咖啡廳",
            "適合約會的咖啡廳",
            "安靜適合工作的咖啡廳",
            "適合帶筆電工作一整天的咖啡廳",
            "信義區附近咖啡廳",
            "中山站附近安靜咖啡廳",
            "大安區文青咖啡廳",
        ]
        query_results = [
            {
                "id": f"q{i + 1}",
                "query": attribute_queries_subset[i],
                "category": "attribute",
                "caferoam_avg": 4.0,
                "maps_avg": 2.0,
                "winner": "caferoam",
                "caferoam_normalized": 4.0,
                "caferoam_scores": [2, 2, 1, 1, 0],
                "ndcg5": 0.8,
                "mrr": 1.0,
            }
            for i in range(3)
        ] + [
            {
                "id": f"q{i + 4}",
                "query": mode_queries_extended[i],
                "category": "mode",
                "caferoam_avg": 1.0,
                "maps_avg": 4.0,
                "winner": "maps",
                "caferoam_normalized": 1.4,
                "caferoam_scores": [0, 0, 1, 0, 0],
                "ndcg5": 0.2,
                "mrr": 0.0,
            }
            for i in range(7)
        ]
        report = generate_validation_report(
            query_results=query_results,
            total_shops=75,
            mean_ndcg5=0.38,
            mean_mrr=0.3,
            pass_rate=30.0,
        )
        assert "FAIL" in report
        assert "3/10" in report
