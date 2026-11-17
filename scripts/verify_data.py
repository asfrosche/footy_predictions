"""Check the Premier League data against the other sources and report any problems.

Checks:
1. Teams: the FPL and livescore club names all match the site's Premier League teams.
2. Results: every completed match in our data has the same score in the livescore feed,
   and every completed livescore match is in our data.
3. Table: our standings match the livescore table on played and points.
4. FPL players: every player's club is one of the site's teams.

Run the fetch scripts first:
    python scripts/fetch_fpl_data.py
    python scripts/fetch_livescore_data.py

Exit code 0 when every check passes, 1 otherwise. Nothing is changed.

Usage:
    python scripts/verify_data.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app import data  # noqa: E402

GENERATED = ROOT / "data" / "generated"


def load(name: str) -> dict:
    path = GENERATED / name
    if not path.exists():
        raise SystemExit(f"missing {path.relative_to(ROOT)}: run the fetch script first")
    return json.loads(path.read_text(encoding="utf-8"))


def check_teams(site_teams: set[str], fpl: dict, livescore: dict) -> list[str]:
    problems = []
    fpl_teams = {p["team"] for p in fpl["players"]}
    live_teams = {m["home"] for m in livescore["matches"]} | {m["away"] for m in livescore["matches"]}
    for label, names in (("FPL", fpl_teams), ("livescore", live_teams)):
        unknown = sorted(names - site_teams)
        if unknown:
            problems.append(f"{label} clubs not in the site's team list: {', '.join(unknown)}")
        missing = sorted(site_teams - names)
        if missing:
            problems.append(f"site teams not found in {label}: {', '.join(missing)}")
    return problems


def check_results(our_matches: list[dict], livescore: dict) -> tuple[list[str], int]:
    ours = {
        (m["home"], m["away"]): m
        for m in our_matches
        if m["status"] == "completed"
    }
    problems = []
    compared = 0
    live_completed = [m for m in livescore["matches"] if m["completed"]]
    live_keys = {(m["home"], m["away"]) for m in live_completed}
    for m in live_completed:
        key = (m["home"], m["away"])
        ours_m = ours.get(key)
        if ours_m is None:
            problems.append(f"livescore has a result we lack: {m['home']} {m['home_score']}-{m['away_score']} {m['away']} ({m['date'][:10]})")
            continue
        compared += 1
        if (ours_m["home_score"], ours_m["away_score"]) != (m["home_score"], m["away_score"]):
            problems.append(
                f"score differs: {m['home']} v {m['away']} ours {ours_m['home_score']}-{ours_m['away_score']}, "
                f"livescore {m['home_score']}-{m['away_score']}"
            )
    for key in ours:
        if key not in live_keys:
            problems.append(f"we have a result livescore lacks: {key[0]} v {key[1]}")
    return problems, compared


def check_table(our_table: list[dict], livescore: dict) -> list[str]:
    ours = {r["team"]: r for r in our_table}
    problems = []
    for their in livescore["table"]:
        mine = ours.get(their["team"])
        if mine is None:
            problems.append(f"table: {their['team']} missing from our standings")
        elif (mine["played"], mine["points"]) != (their["played"], their["points"]):
            problems.append(
                f"table: {their['team']} ours P{mine['played']} Pts{mine['points']}, "
                f"livescore P{their['played']} Pts{their['points']}"
            )
    return problems


def main() -> int:
    site_teams = set(data.premier_league_teams())
    fpl = load("fpl_players.json")
    livescore = load("livescore_pl.json")
    our_matches = [m for m in data.all_matches() if m["competition"] == "premier-league"]

    sections = []
    sections.append(("Teams", check_teams(site_teams, fpl, livescore)))
    results_problems, compared = check_results(our_matches, livescore)
    sections.append((f"Results ({compared} completed matches compared)", results_problems))
    sections.append(("Table", check_table(data.premier_league_standings(), livescore)))

    failed = False
    for title, problems in sections:
        status = "OK" if not problems else f"{len(problems)} problem(s)"
        print(f"{title}: {status}")
        for p in problems[:20]:
            print(f"  - {p}")
        if len(problems) > 20:
            print(f"  ... and {len(problems) - 20} more")
        failed = failed or bool(problems)
    print(f"FPL players: {len(fpl['players'])} (clubs checked above)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
