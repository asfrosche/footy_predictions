"""Export each Premier League club's predicted formation and starting XI.

The predicted XI is the squad's preferred starting XI (the simulator's own squad data),
not a confirmed team sheet. Manager and injury fields are written as null: the repo has
no sourced data for them, so the site shows "not available" rather than a guess.

Usage (from the repo root):
    python -m simulator.scripts.export_lineups
Writes data/generated/lineups.json.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from simulator.competitions.premier_league import get_pl_config
from simulator.services import simulation_service as ss
from simulator.services.lineup_prediction import line_of

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "generated" / "lineups.json"


def build() -> dict:
    cfg = get_pl_config()
    squads = ss._build_squads(cfg)
    teams = {}
    for team in sorted(squads):
        sq = squads[team]
        xi = [p.name for p in sq.preferred_starting_xi]
        xi_lines = [line_of(p) for p in sq.preferred_starting_xi]
        teams[team] = {
            "formation": sq.formation,
            "predicted_xi": xi,
            "predicted_xi_lines": xi_lines,
            "xi_source": "predicted from the last match and FPL availability, not a confirmed team sheet",
            "confidence": sq.lineup_confidence,
            "notes": sq.lineup_notes,
            "manager": None,
            "injuries": None,
        }
    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "competition": cfg.name,
        "teams": teams,
        "notes": [
            "Predicted XIs start from the last completed match, adjusted for FPL availability, rest and gaps. Not confirmed team sheets.",
            "Manager and injury fields are null: no sourced data is in the repo.",
        ],
    }


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = build()
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {OUT} ({len(payload['teams'])} teams)")
