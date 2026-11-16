from app import live_odds


def _book(key, home, away, h, d, a):
    return {"key": key, "title": key.title(), "markets": [{"key": "h2h", "outcomes": [
        {"name": home, "price": h}, {"name": "Draw", "price": d}, {"name": away, "price": a}]}]}


def test_prefers_pinnacle_when_present():
    ev = {"home_team": "Arsenal", "away_team": "Chelsea", "commence_time": "2026-11-21T15:00:00Z",
          "bookmakers": [_book("bet365", "Arsenal", "Chelsea", 2.0, 3.5, 4.0),
                         _book("pinnacle", "Arsenal", "Chelsea", 2.1, 3.4, 3.8)]}
    [m] = live_odds.parse_events([ev])
    assert (m["home_win"], m["draw"], m["away_win"]) == (2.1, 3.4, 3.8)
    assert m["source"] == "the-odds-api: Pinnacle"


def test_averages_when_no_pinnacle():
    ev = {"home_team": "A", "away_team": "B", "bookmakers": [
        _book("bet365", "A", "B", 2.0, 3.0, 4.0), _book("betfair", "A", "B", 2.2, 3.2, 3.6)]}
    [m] = live_odds.parse_events([ev])
    assert m["home_win"] == 2.1 and m["away_win"] == 3.8 and m["draw"] == 3.1
    assert "average of 2 bookmakers" in m["source"]


def test_skips_events_without_a_full_market():
    ev = {"home_team": "A", "away_team": "B", "bookmakers": [{"key": "x", "markets": []}]}
    assert live_odds.parse_events([ev]) == []


def test_load_dotenv_does_not_overwrite(tmp_path, monkeypatch):
    env = tmp_path / ".env"
    env.write_text("ODDS_SOURCE=the_odds_api\n# comment\nNEW_KEY='abc'\n", encoding="utf-8")
    monkeypatch.setenv("ODDS_SOURCE", "football_data")
    monkeypatch.delenv("NEW_KEY", raising=False)
    live_odds.load_dotenv(env)
    import os
    assert os.environ["ODDS_SOURCE"] == "football_data"
    assert os.environ["NEW_KEY"] == "abc"
