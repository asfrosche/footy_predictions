"""Loads the JSON data files and turns them into clean, API-ready structures.

Everything here is read-only. Standings and implied odds are derived from the
raw files at request time, so the data files stay the single source of truth.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(os.environ.get("FOOTY_DATA_DIR") or Path(__file__).resolve().parent.parent / "data")
INPUTS_DIR = DATA_DIR / "inputs"  # hand-kept data and fixture files
GENERATED_DIR = DATA_DIR / "generated"  # written by scripts/ (odds cache, model results)

COMPETITIONS = {
    "world-cup": "World Cup",
    "premier-league": "Premier League",
}


@lru_cache(maxsize=None)
def load_json(name: str) -> Any:
    with (INPUTS_DIR / name).open(encoding="utf-8") as fh:
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
    # Keys starting with "_" are metadata, not clubs.
    return [k for k in load_json("epl_teams.json").keys() if not k.startswith("_")]


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


def _odds_rows() -> list[dict]:
    """Live cache from scripts/fetch_odds.py if it exists, otherwise the bundled odds file."""
    live = GENERATED_DIR / "odds_live.json"
    if live.exists():
        with live.open(encoding="utf-8") as fh:
            return json.load(fh)["matches"]
    return load_json("epl_odds.json")["matches"]


def premier_league_odds() -> list[dict]:
    result = []
    for m in _odds_rows():
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


def _now_iso() -> str:
    """Current UTC time in the same format as fixture dates, for string comparison."""
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _odds_by_fixture() -> dict[tuple[str, str], dict]:
    return {(o["home"], o["away"]): o for o in premier_league_odds()}


def home_summary() -> dict:
    """Everything the homepage needs, in one response.

    Only real data is used: fixtures and results from the match files, odds from
    epl_odds.json (margin removed), and title odds from epl_title_odds.json.
    """
    now = _now_iso()
    matches = list(all_matches())
    completed = [m for m in matches if m["status"] == "completed"]
    upcoming = [m for m in matches if m["status"] == "scheduled" and (m["date"] or "") >= now]
    odds = _odds_by_fixture()

    def with_odds(m: dict) -> dict | None:
        row = odds.get((m["home"], m["away"]))
        if row is None:
            return None
        return {**m, "decimal_odds": row["decimal_odds"], "implied_probability": row["implied_probability"]}

    # Upcoming fixtures that have a market price, soonest first.
    priced_upcoming = [x for x in (with_odds(m) for m in upcoming if m["competition"] == "premier-league") if x]

    # Odds rows not tied to a fixture in the match files still count as market prices.
    fixture_keys = {(m["home"], m["away"]) for m in upcoming}
    priced_other = [
        {"home": o["home"], "away": o["away"], "date": None, "competition": "premier-league",
         "competition_name": COMPETITIONS["premier-league"], "status": "scheduled",
         "decimal_odds": o["decimal_odds"], "implied_probability": o["implied_probability"]}
        for o in premier_league_odds() if (o["home"], o["away"]) not in fixture_keys
    ]

    def strongest(x: dict) -> float:
        p = x["implied_probability"]
        return max(p["home"], p["away"])

    favourites = sorted(priced_upcoming + priced_other, key=strongest, reverse=True)[:5]

    return {
        "leagues": len(COMPETITIONS),
        "matches_tracked": len(completed) + len(upcoming),
        "completed_count": len(completed),
        "upcoming_count": len(upcoming),
        "featured": priced_upcoming[:3],
        "favourites": favourites,
        "title_race": title_odds()[:5],
        "latest_results": list(reversed(completed))[:6],
        "next_fixtures": upcoming[:6],
        "insights": homepage_insights(matches, upcoming, odds),
        "generated_at": now,
    }


def model_predictions() -> dict:
    """Per-fixture results from scripts/run_model_predictions.py, if that run has happened."""
    path = GENERATED_DIR / "model_predictions.json"
    if not path.exists():
        return {"generated_at": None, "simulations_per_model": None, "fixtures": {}}
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def upcoming_by_gameweek() -> dict:
    """Premier League fixtures from today on, grouped by gameweek (matchday).

    Each fixture carries the market odds (if any) and the six model versions' results.
    """
    now = _now_iso()
    preds = model_predictions()
    odds = _odds_by_fixture()
    fixtures = [
        m for m in all_matches()
        if m["competition"] == "premier-league" and m["status"] == "scheduled" and (m["date"] or "") >= now
    ]

    weeks: dict[object, list[dict]] = {}
    for m in fixtures:
        row = odds.get((m["home"], m["away"]))
        pred = preds["fixtures"].get(m["id"])
        weeks.setdefault(m["matchday"], []).append({
            "id": m["id"],
            "date": m["date"],
            "home": m["home"],
            "away": m["away"],
            "market": row["implied_probability"] if row else None,
            "models": pred["models"] if pred else None,
        })

    gameweeks = []
    for gw in sorted(weeks, key=lambda g: (g is None, g or 0)):
        rows = sorted(weeks[gw], key=lambda r: r["date"] or "")
        gameweeks.append({
            "gameweek": gw,
            "start": rows[0]["date"],
            "fixtures": rows,
        })

    simulated = sum(1 for g in gameweeks for f in g["fixtures"] if f["models"])
    total = sum(len(g["fixtures"]) for g in gameweeks)
    return {
        "generated_at": now,
        "model_run": {
            "generated_at": preds.get("generated_at"),
            "simulations_per_model": preds.get("simulations_per_model"),
            "fixtures_simulated": simulated,
            "fixtures_total": total,
        },
        "gameweeks": gameweeks,
    }


@lru_cache(maxsize=1)
def lineups_file() -> dict:
    """Predicted formations and XIs, written by simulator/scripts/export_lineups.py."""
    path = GENERATED_DIR / "lineups.json"
    if not path.exists():
        return {"teams": {}}
    return json.loads(path.read_text(encoding="utf-8"))


def _league_positions() -> dict[str, dict]:
    return {row["team"]: row for row in premier_league_standings()}


def previous_matches(team: str, n: int = 5) -> list[dict]:
    """The team's last n completed Premier League matches, newest first.

    Each result carries the opponent's current league position, so the page can show
    the quality of the opposition as well as the result.
    """
    positions = _league_positions()
    done = [
        m for m in all_matches()
        if m["competition"] == "premier-league" and m["status"] == "completed"
        and m["home_score"] is not None and team in (m["home"], m["away"])
    ]
    out = []
    for m in done[-n:][::-1]:
        is_home = m["home"] == team
        gf = m["home_score"] if is_home else m["away_score"]
        ga = m["away_score"] if is_home else m["home_score"]
        opponent = m["away"] if is_home else m["home"]
        out.append({
            "id": m["id"],
            "date": m["date"],
            "venue": "home" if is_home else "away",
            "opponent": opponent,
            "opponent_position": positions.get(opponent, {}).get("position"),
            "score": f"{gf}-{ga}",
            "result": "W" if gf > ga else ("L" if gf < ga else "D"),
        })
    return out


def _next_premier_league_fixture_id(team: str) -> str | None:
    """The team's next scheduled Premier League fixture. The stored XI is for this match."""
    upcoming = [
        m for m in all_matches()
        if m["competition"] == "premier-league" and m["status"] == "scheduled"
        and team in (m["home"], m["away"])
    ]
    return min(upcoming, key=lambda m: m["date"])["id"] if upcoming else None


def _lineup_side(team: str, fixture_id: str) -> dict:
    info = lineups_file().get("teams", {}).get(team, {})
    table_row = _league_positions().get(team, {})
    previous = previous_matches(team)
    return {
        "team": team,
        "manager": _club_managers().get(team),
        "formation": info.get("formation"),
        "predicted_xi": info.get("predicted_xi"),
        "predicted_xi_lines": info.get("predicted_xi_lines"),
        "xi_source": info.get("xi_source"),
        "confidence": info.get("confidence"),
        "notes": info.get("notes") or [],
        # The predicted XI is for the club's next match. Other fixtures get it flagged.
        "for_this_match": _next_premier_league_fixture_id(team) == fixture_id,
        "position": table_row.get("position"),
        "points": table_row.get("points"),
        "played": table_row.get("played"),
        # Oldest first, the usual reading order for form.
        "form": "".join(m["result"] for m in reversed(previous)),
        "previous": previous,
    }


def key_players(team: str, count: int = 3) -> list[dict]:
    """The club's highest scorers in Fantasy Premier League so far, from the FPL API."""
    squad = [p for p in fpl_players() if p["team"] == team]
    squad.sort(key=lambda p: p["total_points"], reverse=True)
    keep = ("id", "name", "full_name", "position", "price", "total_points", "form", "goals", "assists", "status")
    return [{k: p[k] for k in keep} for p in squad[:count]]


def _club_managers() -> dict[str, str]:
    """Current manager per club, from data/inputs/club_managers.json (sourced, see its file)."""
    try:
        return load_json("club_managers.json").get("managers", {})
    except FileNotFoundError:
        return {}


def fixture_detail(fixture_id: str) -> dict | None:
    """One Premier League fixture with its market odds and the stored model results."""
    fixture = next(
        (m for m in all_matches() if m["id"] == fixture_id and m["competition"] == "premier-league"),
        None,
    )
    if fixture is None:
        return None
    row = _odds_by_fixture().get((fixture["home"], fixture["away"]))
    stored = model_predictions()["fixtures"].get(fixture_id)
    detail = {
        "id": fixture["id"],
        "competition_name": fixture["competition_name"],
        "date": fixture["date"],
        "matchday": fixture["matchday"],
        "status": fixture["status"],
        "home": fixture["home"],
        "away": fixture["away"],
        "market": row["implied_probability"] if row else None,
        "market_prices": row["decimal_odds"] if row else None,
        "models": stored["models"] if stored else None,
        "models_source": (
            {"type": "stored", "simulations_per_model": model_predictions().get("simulations_per_model")}
            if stored else None
        ),
    }
    detail["lineups"] = {
        "home": _lineup_side(fixture["home"], fixture_id),
        "away": _lineup_side(fixture["away"], fixture_id),
    }
    detail["key_players"] = {"home": key_players(fixture["home"]), "away": key_players(fixture["away"])}
    detail["injuries"] = {
        "home": None, "away": None,
        "note": "Not available: no injury source has been verified for use.",
    }
    return detail


def fpl_players() -> list[dict]:
    """Player stats from the Fantasy Premier League API, built by scripts/fetch_fpl_data.py."""
    path = GENERATED_DIR / "fpl_players.json"
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)["players"]


# ---------------------------------------------------------------------------
# Homepage insights. Every figure is computed from files in the repo. Where we
# lack the data (xG for teams, corners, cards, odds history), the payload omits
# it and the page shows "Data unavailable" instead.
# ---------------------------------------------------------------------------

OUTCOMES = ("home", "draw", "away")
AVAILABILITY_LABELS = {"i": "Injured", "d": "Doubtful", "s": "Suspended"}


def _generated_json(name: str) -> dict | None:
    """A file written by scripts/, or None if that script has not been run."""
    path = GENERATED_DIR / name
    if not path.exists():
        return None
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def _consensus(models: dict[str, dict]) -> dict[str, float]:
    """Average of the model versions' home / draw / away percentages."""
    return {k: round(sum(models[v][k] for v in models) / len(models), 1) for k in OUTCOMES}


def _model_picks(upcoming: list[dict], preds: dict, odds: dict) -> tuple[list[dict], list[dict]]:
    """Upcoming fixtures ranked by consensus confidence, and the largest model-vs-market gaps."""
    picks: list[dict] = []
    gaps: list[dict] = []
    for m in upcoming:
        pred = preds.get(m["id"])
        if not pred or not pred.get("models"):
            continue
        models = pred["models"]
        consensus = _consensus(models)
        pick = max(OUTCOMES, key=lambda k: consensus[k])
        agree = sum(1 for v in models.values() if max(OUTCOMES, key=lambda k: v[k]) == pick)
        row = odds.get((m["home"], m["away"]))
        market = row["implied_probability"] if row else None
        base = {"id": m["id"], "date": m["date"], "home": m["home"], "away": m["away"],
                "competition_name": m["competition_name"], "model_pct": consensus,
                "market_pct": market, "versions": len(models)}
        picks.append({**base, "pick": pick, "confidence": consensus[pick], "agree": agree})
        if market:
            best = max(OUTCOMES, key=lambda k: consensus[k] - market[k])
            gaps.append({**base, "outcome": best, "gap": round(consensus[best] - market[best], 1)})
    picks.sort(key=lambda r: (-r["confidence"], r["date"] or ""))
    gaps.sort(key=lambda r: -r["gap"])
    return picks, gaps


def _season_trends(pl_completed: list[dict]) -> dict | None:
    n = len(pl_completed)
    if not n:
        return None

    def share(count: int) -> float:
        return round(100 * count / n, 1)

    clean = sum((m["away_score"] == 0) + (m["home_score"] == 0) for m in pl_completed)
    return {
        "matches": n,
        "home_win_pct": share(sum(m["result"] == "home" for m in pl_completed)),
        "draw_pct": share(sum(m["result"] == "draw" for m in pl_completed)),
        "away_win_pct": share(sum(m["result"] == "away" for m in pl_completed)),
        "btts_pct": share(sum(m["home_score"] > 0 and m["away_score"] > 0 for m in pl_completed)),
        "over_2_5_pct": share(sum(m["home_score"] + m["away_score"] > 2 for m in pl_completed)),
        "clean_sheet_pct": round(100 * clean / (2 * n), 1),
        "goals_per_match": round(sum(m["home_score"] + m["away_score"] for m in pl_completed) / n, 2),
    }


def _player_card(p: dict) -> dict:
    return {k: p.get(k) for k in ("id", "name", "team", "position", "price", "total_points",
                                  "form", "expected_goals", "selected_by_percent")}


def _formation_counts() -> list[dict]:
    lineups = _generated_json("lineups.json")
    if not lineups:
        return []
    groups: dict[str, list[str]] = {}
    for team, info in lineups.get("teams", {}).items():
        if info.get("formation"):
            groups.setdefault(info["formation"], []).append(team)
    return sorted(
        ({"formation": f, "clubs": len(teams), "teams": sorted(teams)} for f, teams in groups.items()),
        key=lambda r: (-r["clubs"], r["formation"]),
    )


def _model_performance() -> dict:
    scores = _generated_json("model_scores_pl.json")
    walk = _generated_json("pl_walkforward.json")
    out: dict = {"in_sample": None, "out_of_sample": None}
    if scores:
        out["in_sample"] = {
            "matches": scores.get("matches_scored"),
            "simulations_per_model": scores.get("simulations_per_model"),
            "caveat": scores.get("caveat"),
            "rows": [
                {"name": name, **{k: s.get(k) for k in ("accuracy_pct", "brier", "log_loss", "exact_score_hits")}}
                for name, s in scores.get("summary", {}).items()
            ],
        }
    if walk:
        pooled = walk.get("pooled", {})
        out["out_of_sample"] = {
            "matches": pooled.get("matches"),
            "model": pooled.get("logloss_model"),
            "league_average": pooled.get("logloss_league_average"),
            "uniform": pooled.get("logloss_uniform"),
            "model_minus_league_average": pooled.get("logloss_model_minus_league_average"),
            "seasons": {
                season: {
                    "matches": v["evaluation"]["matches"],
                    "model_log_loss": v["evaluation"]["logloss_model"]["mean"],
                    "league_average_log_loss": v["evaluation"]["logloss_league_average"]["mean"],
                }
                for season, v in walk.get("seasons", {}).items() if v.get("evaluation")
            },
        }
    return out


def homepage_insights(matches: list[dict], upcoming: list[dict], odds: dict) -> dict:
    now = datetime.now(timezone.utc)
    week_ahead = (now + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    model_file = model_predictions()
    preds = model_file["fixtures"]
    pl_upcoming = [m for m in upcoming if m["competition"] == "premier-league"]
    pl_completed = [m for m in matches if m["competition"] == "premier-league"
                    and m["status"] == "completed" and m["home_score"] is not None]

    picks_all, gaps_all = _model_picks(pl_upcoming, preds, odds)
    # The homepage shows the next two weeks only; the whole season is far too wide for a ranking.
    two_weeks = (now + timedelta(days=14)).strftime("%Y-%m-%dT%H:%M:%SZ")
    picks = [r for r in picks_all if (r["date"] or "") <= two_weeks]
    gaps = [r for r in gaps_all if (r["date"] or "") <= two_weeks]
    table = premier_league_standings()
    played_rows = [r for r in table if r["played"]]

    form = {row["team"]: [r["result"] for r in reversed(previous_matches(row["team"], 5))] for row in table[:8]}
    attack = sorted(played_rows, key=lambda r: (-r["gf"] / r["played"], -r["gf"]))[:5]
    defence = sorted(played_rows, key=lambda r: (r["ga"] / r["played"], -r["gd"]))[:5]

    players = fpl_players()
    available = sorted(
        (p for p in players if p.get("status") in AVAILABILITY_LABELS),
        key=lambda p: -(p.get("selected_by_percent") or 0),
    )
    formations = _formation_counts()
    lineups = _generated_json("lineups.json") or {}
    odds_file = _generated_json("odds_live.json") or {}

    return {
        "overview": {
            "pl_leader": ({"team": table[0]["team"], "points": table[0]["points"], "played": table[0]["played"]}
                          if table and table[0]["played"] else None),
            "fixtures_next_7_days": sum(1 for m in pl_upcoming if (m["date"] or "") <= week_ahead),
            "fixtures_with_model_runs": len(picks_all),
            "picks_window_days": 14,
            "model_run_at": model_file.get("generated_at"),
        },
        "model_picks": picks[:6],
        "value_gaps": gaps[:5],
        "league": {
            "table": [{**r, "form": form.get(r["team"], [])} for r in table[:8]],
            "best_attack": [{"team": r["team"], "goals_per_match": round(r["gf"] / r["played"], 2)} for r in attack],
            "best_defence": [{"team": r["team"], "goals_against_per_match": round(r["ga"] / r["played"], 2)}
                             for r in defence],
        },
        "trends": _season_trends(pl_completed),
        "players": {
            "top_points": [_player_card(p) for p in sorted(players, key=lambda p: -p["total_points"])[:5]],
            "top_form": [_player_card(p) for p in sorted(players, key=lambda p: -(p.get("form") or 0))[:5]],
            "top_expected_goals": [
                _player_card(p) for p in sorted(players, key=lambda p: -(p.get("expected_goals") or 0))[:5]
            ],
            "availability": [
                {"name": p["name"], "team": p["team"], "status": AVAILABILITY_LABELS[p["status"]],
                 "news": p.get("news") or "", "selected_by_percent": p.get("selected_by_percent")}
                for p in available[:6]
            ],
        } if players else None,
        "formations": {
            "clubs": len(lineups.get("teams", {})),
            "note": "Predicted from each club's last match and FPL availability, not confirmed team sheets.",
            "counts": formations,
        } if formations else None,
        "model_performance": _model_performance(),
        "market_snapshot_at": odds_file.get("generated_at"),
    }
