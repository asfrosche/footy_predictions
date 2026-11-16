from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import data
from app.main import create_app

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app()) as c:
        yield c


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_summary_counts_match_source(client):
    body = client.get("/api/summary").json()
    total = len(data.all_matches())
    assert body["completed_count"] + body["scheduled_count"] == total
    assert body["completed_count"] > 0


def test_matches_filters(client):
    completed = client.get("/api/matches", params={"status": "completed"}).json()
    assert completed and all(m["status"] == "completed" for m in completed)

    pl = client.get("/api/matches", params={"competition": "premier-league"}).json()
    assert pl and all(m["competition"] == "premier-league" for m in pl)

    team = client.get("/api/matches", params={"team": "arsenal"}).json()
    assert team and all("Arsenal" in (m["home"], m["away"]) for m in team)


def test_match_detail_and_404(client):
    first = client.get("/api/matches").json()[0]
    assert client.get(f"/api/matches/{first['id']}").json()["id"] == first["id"]
    assert client.get("/api/matches/does-not-exist").status_code == 404


def test_invalid_filter_rejected(client):
    assert client.get("/api/matches", params={"status": "bogus"}).status_code == 422


def test_standings_are_internally_consistent(client):
    table = client.get("/api/premier-league/standings").json()
    assert len(table) == len(data.premier_league_teams())
    # Every played match contributes one win/draw/loss to each side.
    assert sum(r["won"] + r["drawn"] + r["lost"] for r in table) == sum(r["played"] for r in table)
    assert sum(r["gf"] for r in table) == sum(r["ga"] for r in table)
    # Each win is 3 points. Each draw appears in two "drawn" counts and is worth 1 point to each side.
    assert sum(r["points"] for r in table) == 3 * sum(r["won"] for r in table) + sum(r["drawn"] for r in table)
    points = [r["points"] for r in table]
    assert points == sorted(points, reverse=True)
    assert [r["position"] for r in table] == list(range(1, len(table) + 1))


def test_standings_points_formula():
    fixtures = [
        {"status": "completed", "home": "A", "away": "B", "home_score": 2, "away_score": 1, "result": "home"},
        {"status": "completed", "home": "B", "away": "C", "home_score": 0, "away_score": 0, "result": "draw"},
    ]
    table = {r["team"]: r for r in data.compute_standings(fixtures, ["A", "B", "C"])}
    assert table["A"]["points"] == 3
    assert table["B"]["points"] == 1
    assert table["C"]["points"] == 1
    assert table["A"]["gd"] == 1


def test_world_cup_groups_have_tables(client):
    groups = client.get("/api/world-cup/groups").json()
    assert groups
    for g in groups:
        assert g["table"]
        assert all(r["played"] <= 3 for r in g["table"])


def test_title_odds_sorted(client):
    teams = client.get("/api/premier-league/title-odds").json()["teams"]
    probs = [t["probability"] for t in teams]
    assert probs == sorted(probs, reverse=True)


def test_odds_probabilities_sum_to_about_100(client):
    for row in client.get("/api/premier-league/odds").json():
        total = sum(row["implied_probability"].values())
        assert 99.0 <= total <= 101.0


def test_team_profile_and_404(client):
    body = client.get("/api/teams/Arsenal").json()
    assert body["club"] is not None
    assert body["club"]["standing"]["team"] == "Arsenal"
    assert client.get("/api/teams/Atlantis FC").status_code == 404


def test_no_personal_data_files_are_shipped():
    # draft_data.json holds Discord user and channel IDs and must never be copied here.
    names = {p.name for p in DATA_DIR.iterdir()}
    assert "draft_data.json" not in names


def test_static_site_served(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "Footy" in res.text
    assert client.get("/matches/").status_code == 200
    assert client.get("/img/logo.png").status_code == 200


def test_sipoc_route_serves_page_directly(client):
    # Direct visit and a repeated request (the same as a refresh) both return the page.
    for _ in range(2):
        res = client.get("/sipoc")
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/html")
        assert "SIPOC analysis" in res.text


def test_sipoc_linked_from_main_nav(client):
    assert 'href="/sipoc"' in client.get("/").text


def test_api_docs_available(client):
    assert client.get("/docs").status_code == 200


def test_home_endpoint_shape(client):
    body = client.get("/api/home").json()
    for key in ("matches_tracked", "completed_count", "upcoming_count", "leagues",
                "featured", "favourites", "title_race", "latest_results", "next_fixtures"):
        assert key in body, key
    assert body["matches_tracked"] == body["completed_count"] + body["upcoming_count"]
    assert len(body["featured"]) <= 3
    for m in body["featured"]:
        p = m["implied_probability"]
        assert abs(p["home"] + p["draw"] + p["away"] - 100) < 0.5
        assert m["status"] == "scheduled"
        assert m["date"] >= body["generated_at"]
