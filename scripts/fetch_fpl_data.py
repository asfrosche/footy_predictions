"""Download Fantasy Premier League data and build the player file the site reads.

Uses the public FPL endpoints that the fantasy-pl-mcp project also reads
(https://github.com/rishijatia/fantasy-pl-mcp, MIT). No login is needed for these.

Files written:
    data/raw/fpl/bootstrap-static.json   raw teams, players and gameweeks (git-ignored)
    data/raw/fpl/fixtures.json           raw fixtures of the season (git-ignored)
    data/generated/fpl_players.json      one slim record per player, used by the site (git-ignored)

Nothing in data/inputs/ is changed by this script.

Usage:
    python scripts/fetch_fpl_data.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from simulator.competitions.premier_league import canonical_team_name  # noqa: E402

RAW_DIR = ROOT / "data" / "raw" / "fpl"
GENERATED_DIR = ROOT / "data" / "generated"
BASE = "https://fantasy.premierleague.com/api"
ENDPOINTS = {
    "bootstrap-static.json": f"{BASE}/bootstrap-static/",
    "fixtures.json": f"{BASE}/fixtures/",
}
HEADERS = {"User-Agent": "footy-predictions-local/1.0", "Accept": "application/json"}


def fetch(url: str) -> dict | list:
    response = requests.get(url, headers=HEADERS, timeout=60)
    response.raise_for_status()
    return response.json()


def _num(value: str | float | int | None) -> float:
    """FPL sends some numbers as strings, e.g. form and expected goals."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def build_players(boot: dict) -> list[dict]:
    """Slim, site-ready player records. Team names use the site's canonical names."""
    team_names = {t["id"]: canonical_team_name(t["name"]) for t in boot["teams"]}
    positions = {p["id"]: p["singular_name_short"] for p in boot["element_types"]}
    players = []
    for p in boot["elements"]:
        players.append({
            "id": p["id"],
            "name": p["web_name"],
            "full_name": f"{p['first_name']} {p['second_name']}".strip(),
            "team": team_names.get(p["team"], "Unknown"),
            "position": positions.get(p["element_type"], "?"),
            "price": round(p["now_cost"] / 10, 1),
            "total_points": p["total_points"],
            "points_per_game": _num(p["points_per_game"]),
            "form": _num(p["form"]),
            "selected_by_percent": _num(p["selected_by_percent"]),
            "minutes": p["minutes"],
            "goals": p["goals_scored"],
            "assists": p["assists"],
            "clean_sheets": p["clean_sheets"],
            "expected_goals": _num(p["expected_goals"]),
            "expected_assists": _num(p["expected_assists"]),
            "ep_next": _num(p["ep_next"]),
            "status": p["status"],
            "news": p["news"] or "",
            "chance_of_playing": p["chance_of_playing_next_round"],
            "starts": p["starts"],
        })
    return players


def main() -> int:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    for filename, url in ENDPOINTS.items():
        data = fetch(url)
        (RAW_DIR / filename).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        print(f"saved {filename}")

    boot = json.loads((RAW_DIR / "bootstrap-static.json").read_text(encoding="utf-8"))
    fixtures = json.loads((RAW_DIR / "fixtures.json").read_text(encoding="utf-8"))
    players = build_players(boot)
    generated = {
        "source": "Fantasy Premier League API (fantasy.premierleague.com)",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "players": players,
    }
    (GENERATED_DIR / "fpl_players.json").write_text(
        json.dumps(generated, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    current = [e["name"] for e in boot["events"] if e.get("is_current")]
    print(f"teams: {len(boot['teams'])}, players: {len(players)}, "
          f"gameweeks: {len(boot['events'])}, fixtures: {len(fixtures)}")
    print(f"current gameweek: {', '.join(current) or 'none'}")
    print("wrote data/generated/fpl_players.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
