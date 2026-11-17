"""Archived: tests for the odds watcher (archive/watchers/odds_watcher.py).
Moved out of fifa_data/tests/test_engine_audit_fixes.py during cleanup. Run only if the
watcher is restored. Needs the imports from that file (json, math, pytest)."""

import json
import math


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
