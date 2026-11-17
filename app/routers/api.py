from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from .. import data

router = APIRouter(tags=["footy"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/summary")
def summary() -> dict:
    """Overview numbers for the home page."""
    matches = data.all_matches()
    completed = [m for m in matches if m["status"] == "completed"]
    scheduled = [m for m in matches if m["status"] == "scheduled"]
    odds = data.title_odds()
    pl_table = data.premier_league_standings()
    return {
        "completed_count": len(completed),
        "scheduled_count": len(scheduled),
        "competitions": [
            {"slug": slug, "name": name} for slug, name in data.COMPETITIONS.items()
        ],
        "latest_results": list(reversed(completed))[:6],
        "next_fixtures": scheduled[:6],
        "title_favourites": odds[:5],
        "league_leader": pl_table[0] if pl_table else None,
    }


@router.get("/home")
def home() -> dict:
    """Homepage data: featured fixtures with odds, favourites, title race, results and fixtures."""
    return data.home_summary()


@router.get("/matches")
def list_matches(
    competition: str | None = Query(None, pattern="^(world-cup|premier-league)$"),
    status: str | None = Query(None, pattern="^(completed|scheduled)$"),
    team: str | None = Query(None, max_length=80),
) -> list[dict]:
    return data.matches_for(competition=competition, status=status, team=team)


@router.get("/matches/{match_id}")
def get_match(match_id: str) -> dict:
    for m in data.all_matches():
        if m["id"] == match_id:
            return m
    raise HTTPException(status_code=404, detail="Match not found")


@router.get("/premier-league/standings")
def premier_league_standings() -> list[dict]:
    return data.premier_league_standings()


@router.get("/premier-league/title-odds")
def premier_league_title_odds() -> dict:
    raw = data.load_json("epl_title_odds.json")
    return {
        "note": raw.get("note"),
        "generated_at": raw.get("generated_at"),
        "teams": data.title_odds(),
    }


@router.get("/premier-league/upcoming")
def premier_league_upcoming() -> dict:
    """Upcoming fixtures by gameweek, with market odds and the six model versions."""
    return data.upcoming_by_gameweek()


@router.get("/premier-league/fixtures/{fixture_id}")
def premier_league_fixture(
    fixture_id: str,
    run: bool = False,
    sims: int = Query(200, ge=50, le=1000),
) -> dict:
    """One fixture with market odds and the six model versions.

    Stored results are returned by default. Pass run=true to run the models now,
    using the given number of simulations per version.
    """
    detail = data.fixture_detail(fixture_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Fixture not found")
    if run:
        from ..model_runner import predict

        detail["models"] = predict(detail["home"], detail["away"], sims)
        detail["models_source"] = {"type": "live", "simulations_per_model": sims}
    return detail


@router.get("/premier-league/fixtures/{fixture_id}/run-stream")
def run_fixture_models_stream(
    fixture_id: str,
    sims: int = Query(200, ge=50, le=1000),
) -> StreamingResponse:
    """Run the six model versions and stream the running results as newline-delimited JSON.

    Each line is one snapshot: done / total simulations per version, and the current
    home / draw / away shares for every version. The last line has finished=true.
    """
    detail = data.fixture_detail(fixture_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Fixture not found")
    from ..model_runner import predict_stream

    def lines():
        try:
            for snap in predict_stream(detail["home"], detail["away"], sims):
                yield json.dumps(snap) + "\n"
        except ValueError as exc:
            yield json.dumps({"error": str(exc), "finished": True}) + "\n"

    return StreamingResponse(lines(), media_type="application/x-ndjson")


@router.get("/players")
def players(
    team: str | None = Query(None, max_length=80),
    position: str | None = Query(None, pattern="^(GKP|DEF|MID|FWD)$"),
    sort: str = Query("total_points", pattern="^(total_points|price|form|selected_by_percent|expected_goals|ep_next)$"),
    limit: int = Query(100, ge=1, le=700),
) -> dict:
    """Fantasy Premier League player stats, filtered and sorted."""
    rows = data.fpl_players()
    if team:
        rows = [p for p in rows if p["team"] == team]
    if position:
        rows = [p for p in rows if p["position"] == position]
    rows = sorted(rows, key=lambda p: p[sort], reverse=True)[:limit]
    return {"count": len(rows), "players": rows}


@router.get("/premier-league/odds")
def premier_league_odds() -> list[dict]:
    return data.premier_league_odds()


@router.get("/world-cup/groups")
def world_cup_groups() -> list[dict]:
    return data.world_cup_groups()


@router.get("/teams/{name}")
def get_team(name: str) -> dict:
    profile = data.team_profile(name)
    if profile is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return profile
