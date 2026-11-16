"""Regression tests for the engine audit fixes.

Each test pins one defect that was found and fixed, so it cannot silently return.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import pytest

from fifa_data.engines.base_engine import shootout_leader_probability
from fifa_data.engines.v1_elo_engine import V1EloMatchEngine
from fifa_data.engines.v6_evaluation_engine import (
    _student_t_two_sided_p,
    chi_square_calibration_test,
    detect_systematic_biases,
    one_sample_t_test,
)


# ── V1: symmetric strength curve ─────────────────────────────────────────────

def _v1() -> V1EloMatchEngine:
    return V1EloMatchEngine({"A": {"ELO": 1500, "PELE": 1500}, "B": {"ELO": 1500, "PELE": 1500}})


def test_v1_strength_curve_is_symmetric_within_clamp():
    eng = _v1()
    for d in (-400.0, -120.0, 0.0, 250.0, 400.0):
        assert eng._upset_factor(d) + eng._upset_factor(-d) == pytest.approx(2.0)


def test_v1_totals_do_not_depend_on_listing_order():
    eng = V1EloMatchEngine({"Strong": {"ELO": 1900, "PELE": 1900}, "Weak": {"ELO": 1700, "PELE": 1700}})
    d = eng._rating("Strong") - eng._rating("Weak")
    total_strong_first = eng.base_goals * (eng._upset_factor(d) + eng._upset_factor(-d))
    total_weak_first = eng.base_goals * (eng._upset_factor(-d) + eng._upset_factor(d))
    assert total_strong_first == pytest.approx(total_weak_first)


# ── Shared shootout rule ─────────────────────────────────────────────────────

def test_shootout_probability_is_driven_by_lambda_difference_and_clamped():
    assert shootout_leader_probability(0.5, 0.0, 0.0005) == pytest.approx(0.5)
    assert shootout_leader_probability(0.5, 1.0, 0.0005) > 0.5
    assert shootout_leader_probability(0.5, -1.0, 0.0005) < 0.5
    assert shootout_leader_probability(0.5, 1000.0, 0.0005) == pytest.approx(0.95)
    assert shootout_leader_probability(0.5, -1000.0, 0.0005) == pytest.approx(0.05)


# ── Statistics: Student t p-values, Hosmer-Lemeshow, bias logic ───────────────

def test_t_p_values_match_reference_values():
    assert _student_t_two_sided_p(2.5, 4) == pytest.approx(0.0668, abs=1e-3)
    assert _student_t_two_sided_p(2.0, 30) == pytest.approx(0.0546, abs=1e-3)
    assert _student_t_two_sided_p(0.0, 10) == pytest.approx(1.0)


def test_small_sample_test_is_not_anticonservative():
    # Under the normal approximation this would be p = 0.012; with t(4) it is ~0.067.
    result = one_sample_t_test([1.0, 2.0, 3.0, 4.0, 6.0])
    assert result["p_approx"] > 0.01


def test_calibration_test_accepts_calibrated_and_rejects_miscalibrated():
    import random

    rng = random.Random(0)
    probs = [rng.random() for _ in range(400)]
    calibrated = [1 if rng.random() < p else 0 for p in probs]
    assert chi_square_calibration_test(probs, calibrated)["p_approx"] > 0.01

    overconfident = [0.9] * 400
    outcomes = [1 if i % 2 == 0 else 0 for i in range(400)]  # true rate 0.5
    result = chi_square_calibration_test(overconfident, outcomes)
    assert result["significant"] is True


def test_home_advantage_bias_is_flagged_on_large_gap():
    metrics = [
        {"home": "A", "away": "B", "v5_home_prob": 0.8, "v5_away_prob": 0.1,
         "predicted_xg_home": 2.0, "predicted_xg_away": 0.8, "actual_home_goals": 0,
         "actual_away_goals": 1, "actual_winner": "B", "predicted_total_goals": 2.8,
         "actual_total_goals": 1, "favorite_strength": "Major favorite"}
        for _ in range(12)
    ]
    names = [b["bias_name"] for b in detect_systematic_biases(metrics)]
    assert "Home Advantage Calibration" in names


def test_over_and_under_prediction_are_both_reported():
    base = {"v5_home_prob": 0.4, "v5_away_prob": 0.3, "predicted_xg_home": 1.0,
            "predicted_xg_away": 1.0, "actual_home_goals": 1, "actual_away_goals": 1,
            "actual_winner": "Draw", "home": "A", "away": "B", "favorite_strength": "Toss-up"}
    over = [dict(base, predicted_total_goals=4.0, actual_total_goals=1) for _ in range(10)]
    names = [b["bias_name"] for b in detect_systematic_biases(over)]
    assert "Goals Overestimation" in names


# ── Odds: no placeholder or ELO-derived prices written as market data ────────

def test_builtin_odds_writer_records_unavailable_not_prices(tmp_path, monkeypatch):
    from fifa_data.scripts import fetch_epl_data as fed

    monkeypatch.setattr(fed, "DATA", tmp_path)
    fed._write_builtin_odds()
    payload = json.loads((tmp_path / "epl_odds.json").read_text(encoding="utf-8"))
    assert payload["matches"] == []
    assert payload["source"] == "unavailable"


def test_title_odds_refuse_placeholder_and_synthetic_sources(tmp_path, monkeypatch):
    from fifa_data.scripts import odds_watcher as ow

    monkeypatch.setattr(ow, "DATA", tmp_path)
    rows = [{"home": "A", "away": "B", "home_win": 2.4, "draw": 3.3, "away_win": 2.9, "source": "builtin"},
            {"home": "C", "away": "D", "home_win": 2.0, "draw": 3.4, "away_win": 3.5, "source": "synthetic-elo"}]
    ow.write_title_odds(rows)
    assert not (tmp_path / "epl_title_odds.json").exists()


def test_title_odds_use_real_prices(tmp_path, monkeypatch):
    from fifa_data.scripts import odds_watcher as ow

    monkeypatch.setattr(ow, "DATA", tmp_path)
    rows = [{"home": "A", "away": "B", "home_win": 2.0, "draw": 3.4, "away_win": 3.5, "source": "theoddsapi"}]
    ow.write_title_odds(rows)
    payload = json.loads((tmp_path / "epl_title_odds.json").read_text(encoding="utf-8"))
    assert math.isclose(sum(payload["title_prob_pct"].values()), 100.0, rel_tol=1e-3)


# ── Engine state: simulated results must not feed later simulations ──────────

def _pl_squads_and_metrics():
    from fifa_data.competitions.premier_league import get_pl_config
    from fifa_data.services import simulation_service as ss

    cfg = get_pl_config()
    return cfg, ss._build_squads(cfg)


def test_v3_simulation_does_not_write_momentum_or_continuity_history():
    from fifa_data.engines import V3DynamicEngine

    cfg, squads = _pl_squads_and_metrics()
    v3 = V3DynamicEngine(squads=squads, team_metrics=cfg.team_metrics, national_data=False,
                         matches_file=cfg.matches_file)
    before = (
        {k: len(v) for k, v in v3.momentum_service.team_history.items()},
        {k: len(v) for k, v in v3.continuity_service.lineup_history.items()},
    )
    for _ in range(5):
        v3.simulate_match("Arsenal", "Aston Villa", True)
    after = (
        {k: len(v) for k, v in v3.momentum_service.team_history.items()},
        {k: len(v) for k, v in v3.continuity_service.lineup_history.items()},
    )
    assert before == after


def test_v5_momentum_is_reset_at_kickoff():
    from fifa_data.engines import V5MatchStateEngine

    cfg, squads = _pl_squads_and_metrics()
    v5 = V5MatchStateEngine(squads=squads, team_metrics=cfg.team_metrics, national_data=False,
                            matches_file=cfg.matches_file)
    seen: list[float] = []
    original = v5._run_phase

    def spy(state, team1, team2, s1, s2, phase, l1, l2, m1, m2, is_extra_time=False):
        if "EARLY_FIRST_HALF" in str(phase):
            seen.append(v5.momentum_service.team_a_momentum)
        return original(state, team1, team2, s1, s2, phase, l1, l2, m1, m2, is_extra_time)

    v5._run_phase = spy
    for _ in range(3):
        v5.simulate_match("Arsenal", "Aston Villa", True)
    assert seen == [0.0, 0.0, 0.0]
