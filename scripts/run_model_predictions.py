"""Run model versions v1-v6 over upcoming Premier League fixtures.

For each fixture and each version, the match is simulated N times with that
version's own simulate_match(). The result is the share of home / draw / away
wins and the most common scoreline. Output: data/generated/model_predictions.json.

Slow: about 30 ms per fixture per simulation across all six versions. The
default N=200 takes roughly 30 minutes for a full season. Results are saved
after every fixture, so a stopped run keeps its progress.

Usage:
    python scripts/run_model_predictions.py              # N=200
    python scripts/run_model_predictions.py --sims 500
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from simulator.competitions.premier_league import get_pl_config  # noqa: E402
from simulator.services import simulation_service as svc  # noqa: E402

FIXTURES = ROOT / "data" / "inputs" / "pl_matches.json"
OUT = ROOT / "data" / "generated" / "model_predictions.json"
MODELS = ["v1", "v2", "v3", "v4", "v5", "v6"]


def upcoming_fixtures() -> list[dict]:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    data = json.loads(FIXTURES.read_text(encoding="utf-8"))
    return [m for m in data["upcoming"] if (m["date"] or "") >= now]


def simulate(engine, home: str, away: str, sims: int) -> dict:
    wins = Counter()
    scores: Counter = Counter()
    for _ in range(sims):
        g1, g2 = engine.simulate_match(home, away)
        scores[(g1, g2)] += 1
        wins["home" if g1 > g2 else "away" if g2 > g1 else "draw"] += 1
    (best_score, _), = scores.most_common(1)
    return {
        "home": round(wins["home"] / sims * 100, 1),
        "draw": round(wins["draw"] / sims * 100, 1),
        "away": round(wins["away"] / sims * 100, 1),
        "likely_score": f"{best_score[0]}-{best_score[1]}",
    }


def save(payload: dict) -> None:
    tmp = OUT.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, OUT)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sims", type=int, default=200)
    args = parser.parse_args()

    config = get_pl_config()
    known = set(config.teams)
    fixtures = upcoming_fixtures()
    unknown = sorted({n for m in fixtures for n in (m["home"]["name"], m["away"]["name"]) if n not in known})
    if unknown:
        print("Team names the engines do not know:", unknown)
        return 1

    engines = {model: svc._competition_engine(model, config) for model in MODELS}
    payload = {
        "generated_at": None,
        "simulations_per_model": args.sims,
        "fixtures": {},
    }
    started = time.time()
    for i, m in enumerate(fixtures, start=1):
        home, away = m["home"]["name"], m["away"]["name"]
        payload["fixtures"][m["id"]] = {
            "home": home,
            "away": away,
            "date": m["date"],
            "matchday": m["matchday"],
            "models": {model: simulate(engines[model], home, away, args.sims) for model in MODELS},
        }
        payload["generated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        save(payload)
        print(f"[{i}/{len(fixtures)}] {home} v {away} ({round(time.time() - started)}s)", flush=True)
    print("done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
