"""Tests for the vcopy1 engine (port of AndrewCarterUK/football-predictor).

These use small synthetic CSV files, so they run in seconds. Training uses few steps.
"""

from __future__ import annotations

import datetime as dt

import numpy as np
import pytest

from simulator.engines.vcopy1_engine import (
    FORM_MATCHES,
    OUTCOMES,
    VCopy1Engine,
    _TeamHistory,
    read_matches,
)

HEADER = "Div,Date,HomeTeam,AwayTeam,FTHG,FTAG,FTR,HS,AS,HST,AST\n"


def _write_csv(path, rows):
    lines = [HEADER]
    for date, home, away, hg, ag, shots in rows:
        ftr = "H" if hg > ag else "A" if ag > hg else "D"
        lines.append(f"E0,{date},{home},{away},{hg},{ag},{ftr},{shots},{shots},{hg},{ag}\n")
    path.write_text("".join(lines), encoding="utf-8")
    return path


def _season(team_a="Arsenal", team_b="Chelsea", n=14):
    """n matches between the two teams, one per week, alternating home side."""
    rows = []
    start = dt.date(2020, 8, 1)
    for i in range(n):
        date = (start + dt.timedelta(days=7 * i)).strftime("%d/%m/%y")
        home, away = (team_a, team_b) if i % 2 == 0 else (team_b, team_a)
        rows.append((date, home, away, 2, 1, 10 + i))
    return rows


def test_form_uses_only_matches_strictly_before_the_date(tmp_path):
    path = _write_csv(tmp_path / "s.csv", _season(n=14))
    history = _TeamHistory(read_matches([path]))
    first_match_date = dt.date(2020, 8, 1)
    assert history.form_before("Arsenal", first_match_date) is None  # no earlier matches
    eleventh = first_match_date + dt.timedelta(days=7 * FORM_MATCHES)
    form = history.form_before("Arsenal", eleventh)
    assert form is not None
    assert form[0] + form[1] + form[2] == FORM_MATCHES  # wins + draws + losses = 10 matches


def test_missing_stats_are_skipped(tmp_path):
    path = tmp_path / "bad.csv"
    path.write_text(HEADER + "E0,01/08/20,Arsenal,Chelsea,2,1,H,,,,\n", encoding="utf-8")
    assert read_matches([path]) == []


@pytest.fixture(scope="module")
def engine(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("vcopy1")
    rows = []
    teams = ["Arsenal", "Chelsea", "Everton", "Fulham", "Leeds", "Liverpool", "Brighton"]
    start = dt.date(2019, 8, 1)
    for round_no in range(12):
        for i in range(0, len(teams) - 1, 2):
            date = (start + dt.timedelta(days=7 * round_no)).strftime("%d/%m/%y")
            rows.append((date, teams[i], teams[i + 1], 1 + (i % 3), (round_no + i) % 3, 12))
    path = _write_csv(tmp / "train.csv", rows)
    return VCopy1Engine(training_csv=path, steps=400, seed=1)


def test_probabilities_are_valid(engine):
    probs = engine.outcome_probabilities("Arsenal", "Chelsea")
    assert set(probs) == set(OUTCOMES)
    assert all(0.0 <= p <= 1.0 for p in probs.values())
    assert sum(probs.values()) == pytest.approx(1.0, abs=1e-9)


def test_scorelines_are_consistent_and_nonnegative(engine):
    for _ in range(200):
        g1, g2 = engine.simulate_match("Arsenal", "Chelsea")
        assert g1 >= 0 and g2 >= 0


def test_no_draw_mode_never_returns_a_draw(engine):
    for _ in range(300):
        g1, g2 = engine.simulate_match("Everton", "Fulham", can_draw=False)
        assert g1 != g2


def test_unseen_team_uses_league_form_and_is_recorded(engine):
    probs = engine.outcome_probabilities("Nowhere United", "Arsenal")
    assert sum(probs.values()) == pytest.approx(1.0, abs=1e-9)
    assert "Nowhere United" in engine.fallback_teams


def test_same_seed_gives_same_training(tmp_path):
    path = _write_csv(tmp_path / "t.csv", _season(n=30))
    a = VCopy1Engine(training_csv=path, steps=200, seed=7)
    b = VCopy1Engine(training_csv=path, steps=200, seed=7)
    assert a.outcome_probabilities("Arsenal", "Chelsea") == b.outcome_probabilities("Arsenal", "Chelsea")
