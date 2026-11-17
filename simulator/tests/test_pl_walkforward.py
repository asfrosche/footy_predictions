"""Tests for the PL walk-forward module: parsing and the results-only model."""
from __future__ import annotations

import pytest

from simulator.benchmark.pl_walkforward import (
    HISTORY_DIR,
    Match,
    PoissonRatings,
    league_average_expected,
    outcome_probs,
    parse_openfootball,
)


@pytest.mark.parametrize("tag,label", [("2023-24", "2023/24"), ("2024-25", "2024/25"), ("2025-26", "2025/26")])
def test_every_historic_season_parses_all_380_matches(tag, label):
    matches = parse_openfootball(HISTORY_DIR / f"premierleague_{tag}.txt", label)
    assert len(matches) == 380
    assert sorted({m.matchday for m in matches}) == list(range(1, 39))
    assert all(m.home != m.away for m in matches)


def test_zero_zero_results_are_parsed():
    matches = parse_openfootball(HISTORY_DIR / "premierleague_2023-24.txt", "2023/24")
    assert any(m.hg == 0 and m.ag == 0 for m in matches)


def test_dates_without_year_use_season_years():
    matches = parse_openfootball(HISTORY_DIR / "premierleague_2024-25.txt", "2024/25")
    assert all(m.date.startswith("2024") or m.date.startswith("2025") for m in matches)
    assert min(m.date for m in matches) >= "2024-08-01"
    assert max(m.date for m in matches) <= "2025-06-30"


def test_poisson_model_recovers_a_stronger_team():
    # Team A scores 3 and concedes 0 in every match against B; B scores 0 and concedes 3.
    prior = []
    for i in range(20):
        prior.append(Match("t", 1 + i % 5, "2024-01-01", "A", "B", 3, 0))
        prior.append(Match("t", 1 + i % 5, "2024-01-01", "B", "A", 0, 3))
    model = PoissonRatings(ridge=1.0)
    model.fit(prior, ["A", "B"])
    lh, la = model.expected("A", "B")
    assert lh > la * 3


def test_outcome_probabilities_sum_to_one():
    p = outcome_probs(1.4, 1.1)
    assert sum(p) == pytest.approx(1.0)


def test_league_average_baseline_uses_only_prior_goals():
    prior = [Match("t", 1, "d", "A", "B", 2, 1), Match("t", 1, "d", "C", "D", 0, 2)]
    h, a = league_average_expected(prior)
    assert h == pytest.approx(1.0)
    assert a == pytest.approx(1.5)
