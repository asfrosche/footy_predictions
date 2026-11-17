"""Score every model version on the completed Premier League matches.

For each completed match, each version is simulated N times (default 100) through
app.model_runner.predict. The outcome shares are then scored against the real result:

- accuracy: the most likely outcome (home, draw or away) was the real one
- Brier score: squared error over the three outcome probabilities (0 is perfect, 2 is worst)
- log loss: -ln(probability given to the real outcome); lower is better
- exact score: the most common simulated scoreline was the real one

A uniform 1/3-1/3-1/3 forecast is included as a reference.

Usage:
    python scripts/score_model_versions.py              # N=100
    python scripts/score_model_versions.py --sims 200
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.model_runner import MODELS, predict  # noqa: E402

MATCHES = ROOT / "simulator" / "data" / "pl_matches.json"
OUT = ROOT / "data" / "generated" / "model_scores_pl.json"


def outcome(h: int, a: int) -> str:
    return "home" if h > a else "away" if a > h else "draw"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sims", type=int, default=100)
    args = ap.parse_args()

    completed = json.loads(MATCHES.read_text(encoding="utf-8"))["completed"]
    completed.sort(key=lambda m: m["date"])

    rows = {m: [] for m in MODELS}
    for i, match in enumerate(completed, 1):
        home, away = match["home"]["name"], match["away"]["name"]
        hs, as_ = int(match["home"]["score"]), int(match["away"]["score"])
        real = outcome(hs, as_)
        real_score = f"{hs}-{as_}"
        result = predict(home, away, sims=args.sims)
        for model in MODELS:
            p = result[model]
            probs = {"home": p["home"] / 100, "draw": p["draw"] / 100, "away": p["away"] / 100}
            rows[model].append({
                "match": f"{home} {hs}-{as_} {away}",
                "probs": probs,
                "real": real,
                "pick": max(probs, key=lambda k: (probs[k], k == "home", k == "draw")),
                "likely_score": p["likely_score"],
                "real_score": real_score,
            })
        print(f"[{i}/{len(completed)}] {home} {hs}-{as_} {away}", flush=True)

    summary = {}
    for model in MODELS:
        data = rows[model]
        n = len(data)
        brier = sum(sum((r["probs"][k] - (1.0 if k == r["real"] else 0.0)) ** 2 for k in r["probs"]) for r in data) / n
        logloss = sum(-math.log(max(r["probs"][r["real"]], 1e-3)) for r in data) / n
        summary[model] = {
            "matches": n,
            "accuracy_pct": round(100 * sum(r["pick"] == r["real"] for r in data) / n, 1),
            "brier": round(brier, 4),
            "log_loss": round(logloss, 4),
            "exact_score_hits": sum(r["likely_score"] == r["real_score"] for r in data),
        }
    n = len(completed)
    uniform = {"home": 1 / 3, "draw": 1 / 3, "away": 1 / 3}
    uni_brier = 0.0
    for m in completed:
        real = outcome(int(m["home"]["score"]), int(m["away"]["score"]))
        for k in uniform:
            uni_brier += (uniform[k] - (1.0 if k == real else 0.0)) ** 2
    summary["uniform_reference"] = {
        "matches": n,
        "accuracy_pct": None,
        "brier": round(uni_brier / n, 4),
        "log_loss": round(math.log(3), 4),
        "exact_score_hits": 0,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "simulations_per_model": args.sims,
        "matches_scored": n,
        "caveat": "Elo and form ratings are current to 2026-11-17, so they already contain these results. "
                  "This is an in-sample score, not a true out-of-sample test.",
        "summary": summary,
    }, indent=2), encoding="utf-8")

    print(f"\n{'model':<10}{'acc%':>7}{'brier':>9}{'logloss':>9}{'exact':>7}")
    for name, s in summary.items():
        acc = "-" if s["accuracy_pct"] is None else f"{s['accuracy_pct']:.1f}"
        print(f"{name:<10}{acc:>7}{s['brier']:>9.4f}{s['log_loss']:>9.4f}{s['exact_score_hits']:>7}")
    print(f"\nwrote {OUT}")


if __name__ == "__main__":
    main()
