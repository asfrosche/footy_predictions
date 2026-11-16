"""Download Premier League results and bookmaker odds from football-data.co.uk.

No key or account is needed. The file holds finished matches only, with prices
from Pinnacle (PP*), Bet365 (B365*) and the market average (Avg*). It is not
live odds: for upcoming prices, use a licensed odds API.

Usage:
    python scripts/fetch_football_data.py 2627     # season 2026/27
"""

from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "raw"  # git-ignored
USER_AGENT = "footy-predictions-local/0.1"


def fetch(season: str) -> Path:
    url = f"https://www.football-data.co.uk/mmz4281/{season}/E0.csv"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dest = OUT_DIR / f"football_data_E0_{season}.csv"
    dest.write_bytes(body)
    return dest


if __name__ == "__main__":
    season = sys.argv[1] if len(sys.argv) > 1 else "2627"
    path = fetch(season)
    print(f"saved {path} ({path.stat().st_size} bytes)")
