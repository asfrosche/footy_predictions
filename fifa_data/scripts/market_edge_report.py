"""Export model probabilities and lineups for upcoming PL fixtures, for comparison with market prices.

The model side is V3 (dynamic engine) expected goals, converted to 1X2 probabilities
and a most-likely scoreline with an independent Poisson score grid. Each fixture also
carries the model's predicted XI and formation, and each side's most recent actual XI
from the completed-match data. No market data is fetched or invented here.

Manager and tactical profiles are not included: the repo has manager profiles only for
national teams, and club tactical profiles are not populated.

Usage (from the repo root):
    python -m fifa_data.scripts.market_edge_report [output.json]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from scipy.stats import poisson

from ..competitions.premier_league import get_pl_config
from ..engines import V3DynamicEngine
from ..services import simulation_service as ss

FIFA_DATA = Path(__file__).resolve().parents[1]
MAX_GOALS = 10


def _score_grid(lam_home: float, lam_away: float):
    grid = [[poisson.pmf(h, lam_home) * poisson.pmf(a, lam_away) for a in range(MAX_GOALS + 1)]
            for h in range(MAX_GOALS + 1)]
    home = sum(grid[h][a] for h in range(MAX_GOALS + 1) for a in range(MAX_GOALS + 1) if h > a)
    draw = sum(grid[h][h] for h in range(MAX_GOALS + 1))
    away = sum(grid[h][a] for h in range(MAX_GOALS + 1) for a in range(MAX_GOALS + 1) if a > h)
    best = max(((h, a) for h in range(MAX_GOALS + 1) for a in range(MAX_GOALS + 1)),
               key=lambda hw: grid[hw[0]][hw[1]])
    total = home + draw + away
    return {
        "home": home / total, "draw": draw / total, "away": away / total,
        "most_likely_score": f"{best[0]}-{best[1]}",
        "most_likely_score_prob": grid[best[0]][best[1]],
    }


def _last_actual_lineups(completed: list[dict]) -> dict[str, dict]:
    """Most recent completed match per team, with its real starting XI and formation."""
    latest: dict[str, dict] = {}
    for m in sorted(completed, key=lambda x: x["date"]):
        for side in ("home", "away"):
            team = m[side]["name"]
            latest[team] = {
                "date": m["date"][:10],
                "opponent": m["away" if side == "home" else "home"]["name"],
                "formation": m[side].get("formation"),
                "xi": [p["name"] for p in m[side].get("players", [])],
            }
    return latest


def build_report() -> dict:
    cfg = get_pl_config()
    squads = ss._build_squads(cfg)
    engine = V3DynamicEngine(data_dir=str(FIFA_DATA), squads=squads, team_metrics=cfg.team_metrics,
                             national_data=False, matches_file=cfg.matches_file)
    raw = json.loads(Path(cfg.matches_file).read_text(encoding="utf-8"))
    last_xi = _last_actual_lineups(raw["completed"])

    def model_xi(team: str) -> dict:
        sq = squads[team]
        return {
            "formation": sq.formation,
            "xi": [p.name for p in sq.preferred_starting_xi],
            "source": "preferred starting XI from squad data (not confirmed team sheet)",
        }

    fixtures = []
    for m in sorted(raw["upcoming"], key=lambda x: x["date"]):
        home, away = m["home"]["name"], m["away"]["name"]
        lam_h, lam_a = engine.expected_goals(engine.get_team_strength(home), engine.get_team_strength(away))
        grid = _score_grid(lam_h, lam_a)
        fixtures.append({
            "id": m.get("id"),
            "date": m["date"],
            "matchday": m.get("matchday"),
            "home": home,
            "away": away,
            "lambda_home": round(lam_h, 3),
            "lambda_away": round(lam_a, 3),
            "model": {k: (round(v, 4) if isinstance(v, float) else v) for k, v in grid.items()},
            "lineups": {
                "home": {"team": home, "predicted": model_xi(home), "last_actual": last_xi.get(home)},
                "away": {"team": away, "predicted": model_xi(away), "last_actual": last_xi.get(away)},
            },
            "manager": {"home": None, "away": None, "note": "No club manager data in the repo"},
            "tactics": {"home": None, "away": None, "note": "No club tactical profiles in the repo"},
        })
    return {
        "competition": "Premier League 2026/2027",
        "model": "V3 dynamic engine expected goals -> independent Poisson score grid",
        "generated_from_completed_matches": len(raw["completed"]),
        "last_completed_date": max(x["date"] for x in raw["completed"])[:10],
        "caveats": [
            "Model probabilities are not validated for calibration; see the engine audit.",
            "Market prices are not included; they are entered by the user.",
            "Predicted XIs are preferred starting XIs, not confirmed team sheets.",
        ],
        "fixtures": fixtures,
    }


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else FIFA_DATA / "data" / "market_edge_model.json"
    report = build_report()
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out} ({len(report['fixtures'])} fixtures)")
