"""Move finished Premier League matches from football-data.co.uk into data/pl_matches.json.

Reads data/raw/football_data_E0_<season>.csv (run scripts/fetch_football_data.py first).
Each finished match is moved from "upcoming" to "completed" with its score. Names are
mapped from the short football-data names to the full names used in the fixture file.

Safety:
- Writes a timestamped backup of pl_matches.json before changing anything.
- Refuses to write if any CSV result has no matching fixture.

Usage:
    python scripts/refresh_results.py            # dry run: report only
    python scripts/refresh_results.py --write    # apply the changes
"""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = ROOT / "data" / "pl_matches.json"
RAW = ROOT / "data" / "raw" / "football_data_E0_2627.csv"
BACKUP_DIR = ROOT / "data" / "backups"

# football-data short name -> name used in pl_matches.json
NAME_MAP = {
    "Brighton": "Brighton & Hove Albion",
    "Coventry": "Coventry City",
    "Hull": "Hull City",
    "Ipswich": "Ipswich Town",
    "Leeds": "Leeds United",
    "Man City": "Manchester City",
    "Man United": "Manchester United",
    "Newcastle": "Newcastle United",
    "Nott'm Forest": "Nottingham Forest",
    "Tottenham": "Tottenham Hotspur",
}


def canon(name: str) -> str:
    return NAME_MAP.get(name, name)


def load_results() -> list[dict]:
    with RAW.open(encoding="utf-8-sig", newline="") as fh:
        rows = [r for r in csv.DictReader(fh) if r.get("FTR")]
    return [
        {
            "home": canon(r["HomeTeam"]),
            "away": canon(r["AwayTeam"]),
            "home_score": int(r["FTHG"]),
            "away_score": int(r["FTAG"]),
        }
        for r in rows
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="apply the changes (default is a dry run)")
    args = parser.parse_args()

    if not RAW.exists():
        print(f"Missing {RAW}. Run scripts/fetch_football_data.py first.")
        return 1

    data = json.loads(FIXTURES.read_text(encoding="utf-8"))
    results = load_results()
    done_pairs = {(m["home"]["name"], m["away"]["name"]) for m in data["completed"]}
    upcoming_by_pair = {(m["home"]["name"], m["away"]["name"]): m for m in data["upcoming"]}

    to_move, missing, already = [], [], 0
    for r in results:
        pair = (r["home"], r["away"])
        if pair in done_pairs:
            already += 1
        elif pair in upcoming_by_pair:
            to_move.append((r, upcoming_by_pair[pair]))
        else:
            missing.append(pair)

    print(f"CSV finished matches: {len(results)}")
    print(f"already completed in file: {already}")
    print(f"to move from upcoming to completed: {len(to_move)}")
    if missing:
        print("NO FIXTURE for these results. Nothing written:")
        for home, away in missing:
            print(f"  {home} v {away}")
        return 1

    if not args.write:
        print("Dry run. Run with --write to apply.")
        return 0

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = BACKUP_DIR / f"pl_matches-{stamp}.json"
    shutil.copy2(FIXTURES, backup)

    moved_ids = set()
    for r, fixture in to_move:
        fixture["home"]["score"] = r["home_score"]
        fixture["away"]["score"] = r["away_score"]
        if r["home_score"] > r["away_score"]:
            fixture["winner"] = fixture["home"]["name"]
        elif r["away_score"] > r["home_score"]:
            fixture["winner"] = fixture["away"]["name"]
        else:
            fixture["winner"] = None
        fixture["status"] = 0
        data["completed"].append(fixture)
        moved_ids.add(fixture["id"])

    data["upcoming"] = [m for m in data["upcoming"] if m["id"] not in moved_ids]
    data["completed"].sort(key=lambda m: m["date"])
    data["completed_count"] = len(data["completed"])
    data["upcoming_count"] = len(data["upcoming"])
    data["last_updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    FIXTURES.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"backup saved to {backup}")
    print(f"completed now {data['completed_count']}, upcoming now {data['upcoming_count']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
