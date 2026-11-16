"""Fetch upcoming Premier League odds for the homepage.

Settings come from .env (see .env.example):
    ODDS_SOURCE=football_data   uses football-data.co.uk (finished matches only)
    ODDS_SOURCE=the_odds_api    uses The Odds API (needs ODDS_API_KEY, spends credits)

The Odds API is only called with --confirm, so a plain run never uses credits.

Usage:
    python scripts/fetch_odds.py                 # check settings, no network call
    python scripts/fetch_odds.py --confirm       # call The Odds API (if selected)
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from app import live_odds  # noqa: E402
import fetch_football_data  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--confirm", action="store_true", help="allow a call to The Odds API (spends credits)")
    args = parser.parse_args()

    live_odds.load_dotenv(ROOT / ".env")
    source = os.environ.get("ODDS_SOURCE", "football_data").strip().lower()

    if source == "football_data":
        path = fetch_football_data.fetch("2627")
        print(f"football-data.co.uk saved to {path}")
        print("Note: this file has finished matches only, so it has no upcoming prices.")
        print("The homepage keeps using data/epl_odds.json until a live source is set.")
        return 0

    if source == "the_odds_api":
        key = os.environ.get("ODDS_API_KEY", "").strip()
        if not key:
            print("ODDS_API_KEY is empty. Add it to .env, then run again.")
            return 1
        if not args.confirm:
            print("ODDS_SOURCE is the_odds_api. Nothing was called.")
            print("Run with --confirm to fetch one set of odds (this uses credits).")
            return 0
        events, remaining = live_odds.fetch_the_odds_api(key)
        matches = live_odds.parse_events(events)
        path = live_odds.write_cache(matches, source="the_odds_api")
        print(f"saved {len(matches)} priced fixtures to {path}")
        print(f"requests remaining this month: {remaining or 'unknown'}")
        books = sorted({m['source'] for m in matches})
        print("price sources used:", ", ".join(books) if books else "none")
        return 0

    print(f"Unknown ODDS_SOURCE '{source}'. Use football_data or the_odds_api.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
