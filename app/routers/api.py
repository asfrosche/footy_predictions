from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

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
