"""Archived: checks the synthetic odds generator in archive/watchers/odds_watcher.py.
Moved out of fifa_data/tests/test_epl_league.py during cleanup."""


def test_synthetic_odds_are_probabilities():
    from fifa_data.scripts.odds_watcher import synthetic_odds_for_fixtures

    rows = synthetic_odds_for_fixtures()
    assert rows
    for row in rows:
        assert row["home"] != row["away"]
        inv = 1.0 / row["home_win"] + 1.0 / row["draw"] + 1.0 / row["away_win"]
        assert 0.9 <= inv <= 1.35, row
        assert row["home_win"] > 1.0
        assert row["draw"] > 1.0
        assert row["away_win"] > 1.0
