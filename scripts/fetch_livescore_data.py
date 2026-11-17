"""Download Premier League results and standings from the Free Football Live Scores API.

Source: https://github.com/rezarahiminia/livescoreFootball (hosted at worldcup26.ir).
The public endpoints need no key. The API reads its own database, so this is a
second source for checking our data. It does not replace data/inputs/.

Files written:
    data/raw/livescore/eng1-fixtures.json     raw fixtures and results (git-ignored)
    data/raw/livescore/eng1-standings.json    raw standings (git-ignored)
    data/generated/livescore_pl.json          slim results and table used for the cross-check

The script also compares its table with our own table (app/data.py). Differences are
printed, and nothing is changed.

Usage:
    python scripts/fetch_livescore_data.py
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

RAW_DIR = ROOT / "data" / "raw" / "livescore"
GENERATED_DIR = ROOT / "data" / "generated"
BASE = "https://worldcup26.ir/get/soccer/eng.1"
HEADERS = {"User-Agent": "footy-predictions-local/1.0", "Accept": "application/json"}
# Season window for the 2026/27 season. Matches outside it are not needed.
FROM, TO = "20260801", "20270601"


def get_json(url: str) -> dict:
    response = requests.get(url, headers=HEADERS, timeout=60)
    response.raise_for_status()
    return response.json()


def fetch_all_fixtures() -> list[dict]:
    """Every page of the fixtures endpoint for the season window."""
    events: list[dict] = []
    page = 1
    while True:
        data = get_json(f"{BASE}/fixtures?status=all&from={FROM}&to={TO}&page={page}")
        events.extend(data.get("events") or [])
        if page >= int(data.get("pageCount") or 1):
            break
        page += 1
    return events


def _stat(entry: dict, name: str) -> float:
    for s in entry.get("stats", []):
        if s.get("name") == name:
            try:
                return float(s["displayValue"])
            except (TypeError, ValueError):
                return 0.0
    return 0.0


def slim_results(events: list[dict]) -> list[dict]:
    """One record per match, with canonical team names and final scores where available."""
    rows = []
    for ev in events:
        comp = (ev.get("competitions") or [{}])[0]
        competitors = comp.get("competitors", [])
        home = next((c for c in competitors if c.get("homeAway") == "home"), None)
        away = next((c for c in competitors if c.get("homeAway") == "away"), None)
        if not home or not away:
            continue
        status = (comp.get("status") or ev.get("status") or {}).get("type", {})
        rows.append({
            "id": ev["id"],
            "date": ev.get("date"),
            "home": canonical_team_name(home["team"]["name"]) if isinstance(home.get("team"), dict) else home.get("displayName", ""),
            "away": canonical_team_name(away["team"]["name"]) if isinstance(away.get("team"), dict) else away.get("displayName", ""),
            "home_score": int(home["score"]) if str(home.get("score", "")).isdigit() else None,
            "away_score": int(away["score"]) if str(away.get("score", "")).isdigit() else None,
            "completed": bool(status.get("completed")),
            "status": status.get("description", ""),
        })
    return rows


def slim_table(standings: dict) -> list[dict]:
    entries = standings["children"][0]["standings"]["entries"]
    table = []
    for e in entries:
        table.append({
            "team": canonical_team_name(e["team"]["name"]),
            "played": int(_stat(e, "gamesPlayed")),
            "won": int(_stat(e, "wins")),
            "drawn": int(_stat(e, "ties")),
            "lost": int(_stat(e, "losses")),
            "goals_for": int(_stat(e, "pointsFor")),
            "goals_against": int(_stat(e, "pointsAgainst")),
            "points": int(_stat(e, "points")),
            "rank": int(_stat(e, "rank")),
        })
    return sorted(table, key=lambda r: r["rank"])


def compare_with_our_table(table: list[dict]) -> None:
    """Print where the two tables disagree on points. Our table comes from app/data.py."""
    try:
        from app import data
    except Exception as exc:  # the cross-check is optional
        print(f"cross-check skipped: {exc}")
        return
    ours = {row["team"]: row for row in data.premier_league_standings()}
    theirs = {row["team"]: row for row in table}
    if not ours:
        print("cross-check skipped: no completed results in our data")
        return
    diffs = []
    for team, their_row in theirs.items():
        our_row = ours.get(team)
        if our_row is None:
            diffs.append(f"{team}: missing from our table")
        elif our_row["played"] != their_row["played"] or our_row["points"] != their_row["points"]:
            diffs.append(
                f"{team}: ours P{our_row['played']} Pts{our_row['points']}, "
                f"livescore P{their_row['played']} Pts{their_row['points']}"
            )
    print(f"cross-check: {len(theirs) - len(diffs)} of {len(theirs)} clubs agree on played and points")
    for line in diffs:
        print("  " + line)


def main() -> int:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)

    events = fetch_all_fixtures()
    standings = get_json(f"{BASE}/standings")
    (RAW_DIR / "eng1-fixtures.json").write_text(json.dumps(events, ensure_ascii=False), encoding="utf-8")
    (RAW_DIR / "eng1-standings.json").write_text(json.dumps(standings, ensure_ascii=False), encoding="utf-8")

    results = slim_results(events)
    table = slim_table(standings)
    generated = {
        "source": "Free Football Live Scores API (worldcup26.ir), league eng.1",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "matches": results,
        "table": table,
    }
    (GENERATED_DIR / "livescore_pl.json").write_text(
        json.dumps(generated, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    completed = sum(1 for r in results if r["completed"])
    print(f"fixtures: {len(results)} ({completed} completed), table rows: {len(table)}")
    compare_with_our_table(table)
    return 0


if __name__ == "__main__":
    sys.exit(main())
