"""Upcoming Premier League odds from The Odds API, cached to data/generated/odds_live.json.

Only the fetch step talks to the network. Parsing and caching are plain functions,
so they can be tested without a key or any credits.
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("FOOTY_DATA_DIR") or ROOT / "data")
CACHE_FILE = DATA_DIR / "generated" / "odds_live.json"

API_BASE = "https://api.the-odds-api.com/v4"
SPORT_KEY = "soccer_epl"  # Premier League
PREFERRED_BOOKMAKER = "pinnacle"  # the sharp reference price; fall back to the average


def load_dotenv(path: Path = ROOT / ".env") -> None:
    """Read KEY=VALUE lines into os.environ. Existing variables are not overwritten."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


# Odds API names that differ from the names in the fixture files.
TEAM_ALIASES = {
    "Brighton and Hove Albion": "Brighton & Hove Albion",
}


def normalise_team(name: str) -> str:
    return TEAM_ALIASES.get(name, name)


def _h2h_prices(bookmaker: dict, home: str, away: str) -> dict[str, float] | None:
    for market in bookmaker.get("markets", []):
        if market.get("key") != "h2h":
            continue
        prices: dict[str, float] = {}
        for outcome in market.get("outcomes", []):
            name, price = outcome.get("name"), outcome.get("price")
            if name == home:
                prices["home"] = float(price)
            elif name == away:
                prices["away"] = float(price)
            elif name == "Draw":
                prices["draw"] = float(price)
        if {"home", "draw", "away"} <= prices.keys():
            return prices
    return None


def parse_events(events: list[dict]) -> list[dict]:
    """Turn raw Odds API events into the shape data.py already reads.

    Uses Pinnacle when it is present. Otherwise it averages the prices across the
    bookmakers that returned a full head-to-head market for the match.
    """
    matches = []
    for ev in events:
        home, away = ev.get("home_team"), ev.get("away_team")
        if not home or not away:
            continue
        home, away = normalise_team(home), normalise_team(away)
        chosen = None
        raw_home, raw_away = ev["home_team"], ev["away_team"]
        for book in ev.get("bookmakers", []):
            if book.get("key") == PREFERRED_BOOKMAKER:
                prices = _h2h_prices(book, raw_home, raw_away)
                if prices:
                    chosen = (prices, book.get("title", PREFERRED_BOOKMAKER))
                    break
        if chosen is None:
            collected = [p for b in ev.get("bookmakers", []) if (p := _h2h_prices(b, raw_home, raw_away))]
            if not collected:
                continue
            avg = {k: round(sum(p[k] for p in collected) / len(collected), 3) for k in ("home", "draw", "away")}
            chosen = (avg, f"average of {len(collected)} bookmakers")
        prices, label = chosen
        matches.append({
            "home": home,
            "away": away,
            "home_win": prices["home"],
            "draw": prices["draw"],
            "away_win": prices["away"],
            "source": f"the-odds-api: {label}",
            "commence_time": ev.get("commence_time"),
        })
    return matches


def write_cache(matches: list[dict], source: str) -> Path:
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": source,
        "matches": matches,
    }
    CACHE_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return CACHE_FILE


def fetch_the_odds_api(api_key: str) -> tuple[list[dict], str | None]:
    """One call to the odds endpoint. Returns (events, requests_remaining).

    This spends credits. Only call it after an explicit go-ahead.
    """
    params = urllib.parse.urlencode({
        "apiKey": api_key,
        "regions": "eu,uk",
        "markets": "h2h",
        "oddsFormat": "decimal",
        "dateFormat": "iso",
    })
    url = f"{API_BASE}/sports/{SPORT_KEY}/odds?{params}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        remaining = resp.headers.get("x-requests-remaining")
        events: Any = json.loads(resp.read().decode("utf-8"))
    return events, remaining
