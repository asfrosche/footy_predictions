"""Loads the JSON data files and turns them into clean, API-ready structures.

Everything here is read-only. Standings and implied odds are derived from the
raw files at request time, so the data files stay the single source of truth.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(os.environ.get("FOOTY_DATA_DIR") or Path(__file__).resolve().parent.parent / "data")

COMPETITIONS = {
    "world-cup": "World Cup",
    "premier-league": "Premier League",
}


@lru_cache(maxsize=None)
def load_json(name: str) -> Any:
    with (DATA_DIR / name).open(encoding="utf-8") as fh:
        return json.load(fh)


def _outcome(home_score: int | None, away_score: int | None) -> str | None:
    if home_score is None or away_score is None:
        return None
    if home_score > away_score:
        return "home"
    if away_score > home_score:
        return "away"
    return "draw"


def _normalize(raw: dict, competition_slug: str, status: str) -> dict:
    home, away = raw["home"], raw["away"]
    home_score, away_score = home.get("score"), away.get("score")
    return {
        "id": str(raw["id"]),
        "competition": competition_slug,
        "competition_name": COMPETITIONS[competition_slug],
        "date": raw.get("date"),
        "stage": raw.get("stage"),
        "group": raw.get("group"),
        "matchday": raw.get("matchday"),
        "status": status,
        "home": home["name"],
        "away": away["name"],
        "home_score": home_score,
        "away_score": away_score,
        "result": _outcome(home_score, away_score) if status == "completed" else None,
    }


@lru_cache(maxsize=1)
def all_matches() -> tuple[dict, ...]:
    """Every fixture from both competitions, oldest first."""
    matches: list[dict] = []
    for slug, filename in (("world-cup", "matches.json"), ("premier-league", "pl_matches.json")):
        source = load_json(filename)
        matches += [_normalize(m, slug, "completed") for m in source.get("completed", [])]
        matches += [_normalize(m, slug, "scheduled") for m in source.get("upcoming", [])]
    matches.sort(key=lambda m: (m["date"] or "", m["id"]))
    return tuple(matches)


def matches_for(competition: str | None = None, status: str | None = None,
                team: str | None = None) -> list[dict]:
    result = []
    needle = team.casefold() if team else None
    for m in all_matches():
        if competition and m["competition"] != competition:
            continue
        if status and m["status"] != status:
            continue
        if needle and needle not in (m["home"].casefold(), m["away"].casefold()):
            continue
        result.append(m)
    return result


def compute_standings(matches: list[dict], teams: list[str]) -> list[dict]:
    """League table from completed matches. Every name in `teams` gets a row."""
    rows = {
        name: {"team": name, "played": 0, "won": 0, "drawn": 0, "lost": 0,
               "gf": 0, "ga": 0, "gd": 0, "points": 0}
        for name in teams
    }
    for m in matches:
        if m["status"] != "completed" or m["home_score"] is None:
            continue
        home, away = rows.setdefault(m["home"], _blank(m["home"])), rows.setdefault(m["away"], _blank(m["away"]))
        hs, aws = m["home_score"], m["away_score"]
        for row, gf, ga in ((home, hs, aws), (away, aws, hs)):
            row["played"] += 1
            row["gf"] += gf
            row["ga"] += ga
        if m["result"] == "home":
            home["won"] += 1; home["points"] += 3; away["lost"] += 1
        elif m["result"] == "away":
            away["won"] += 1; away["points"] += 3; home["lost"] += 1
        else:
            home["drawn"] += 1; away["drawn"] += 1; home["points"] += 1; away["points"] += 1

    table = list(rows.values())
    for row in table:
        row["gd"] = row["gf"] - row["ga"]
    table.sort(key=lambda r: (-r["points"], -r["gd"], -r["gf"], r["team"]))
    for position, row in enumerate(table, start=1):
        row["position"] = position
    return table


def _blank(name: str) -> dict:
    return {"team": name, "played": 0, "won": 0, "drawn": 0, "lost": 0,
            "gf": 0, "ga": 0, "gd": 0, "points": 0}


def premier_league_teams() -> list[str]:
    return list(load_json("epl_teams.json").keys())


def premier_league_standings() -> list[dict]:
    return compute_standings(matches_for(competition="premier-league"), premier_league_teams())


def world_cup_groups() -> list[dict]:
    """Group tables for the World Cup, using each group's own fixtures."""
    fixtures = matches_for(competition="world-cup")
    groups: dict[str, list[dict]] = {}
    for m in fixtures:
        if m["group"]:
            groups.setdefault(m["group"], []).append(m)
    result = []
    for name in sorted(groups):
        teams = sorted({m["home"] for m in groups[name]} | {m["away"] for m in groups[name]})
        result.append({
            "group": name,
            "table": compute_standings(groups[name], teams),
            "fixtures": groups[name],
        })
    return result


def title_odds() -> list[dict]:
    raw = load_json("epl_title_odds.json")["title_prob_pct"]
    ranked = sorted(raw.items(), key=lambda kv: -kv[1])
    return [{"team": team, "probability": round(prob, 2)} for team, prob in ranked]


def implied_probabilities(home_win: float, draw: float, away_win: float) -> dict[str, float]:
    """Convert decimal odds to percentages, removing the bookmaker margin."""
    raw = {"home": 1 / home_win, "draw": 1 / draw, "away": 1 / away_win}
    total = sum(raw.values())
    return {k: round(v / total * 100, 1) for k, v in raw.items()}


def premier_league_odds() -> list[dict]:
    result = []
    for m in load_json("epl_odds.json")["matches"]:
        result.append({
            "home": m["home"],
            "away": m["away"],
            "decimal_odds": {"home": m["home_win"], "draw": m["draw"], "away": m["away_win"]},
            "implied_probability": implied_probabilities(m["home_win"], m["draw"], m["away_win"]),
            "source": m.get("source"),
        })
    return result


def team_profile(name: str) -> dict | None:
    """Everything we know about one team. Returns None if the team is unknown."""
    epl = load_json("epl_teams.json")
    tactical = load_json("tactical_profiles.json")
    strength = load_json("national_strength_modifiers.json")
    fixtures = matches_for(team=name)

    is_club = name in epl
    is_national = name in tactical or name in strength or any(
        m["competition"] == "world-cup" and name in (m["home"], m["away"]) for m in fixtures
    )
    if not (is_club or is_national or fixtures):
        return None

    profile: dict[str, Any] = {
        "name": name,
        "fixtures": fixtures,
        "club": None,
        "national": None,
    }
    if is_club:
        standing = next((r for r in premier_league_standings() if r["team"] == name), None)
        title = next((t for t in title_odds() if t["team"] == name), None)
        profile["club"] = {
            "code": epl[name].get("code"),
            "elo": epl[name].get("elo"),
            "standing": standing,
            "title_probability": title["probability"] if title else None,
        }
    if is_national:
        profile["national"] = {
            "strength_modifier": strength.get(name),
            "tactical_profile": tactical.get(name),
        }
    return profile
