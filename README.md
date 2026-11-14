# Footy Predictions

Fixtures, results, league tables, World Cup group tables and market odds, served by a FastAPI backend with a black-and-blue static site.

## Pages

| Route | What it shows |
|---|---|
| `/` | Overview: headline numbers, latest results, next fixtures, title favourites |
| `/#/matches` | All matches, filterable by competition, status and team |
| `/#/premier-league` | League table, title odds, match odds with the margin removed |
| `/#/world-cup` | Group tables built from each group's fixtures |
| `/#/team/<name>` | Team profile and fixtures |
| `/sipoc` | SIPOC analysis of the application (suppliers, inputs, process, outputs, customers) |
| `/docs` | Interactive API docs (FastAPI) |

## API

All endpoints are under `/api`.

- `GET /api/health`
- `GET /api/summary`
- `GET /api/matches?competition=world-cup|premier-league&status=completed|scheduled&team=...`
- `GET /api/matches/{match_id}`
- `GET /api/premier-league/standings`
- `GET /api/premier-league/title-odds`
- `GET /api/premier-league/odds`
- `GET /api/world-cup/groups`
- `GET /api/teams/{name}`

## Run it

```bash
python -m venv .venv
. .venv/Scripts/activate        # Windows (Git Bash: source .venv/Scripts/activate)
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Then open http://127.0.0.1:8000.

## Test

```bash
python -m pytest
```

## Data

The app reads JSON files from `data/`. Set `FOOTY_DATA_DIR` to point it at another folder.

| File | Contents |
|---|---|
| `matches.json` | World Cup fixtures and results |
| `pl_matches.json` | Premier League fixtures and results |
| `epl_teams.json` | Premier League clubs (code, Elo) |
| `epl_odds.json` | Premier League match odds (decimal) |
| `epl_title_odds.json` | Title-win approximation |
| `tactical_profiles.json` | National team tactical profiles |
| `national_strength_modifiers.json` | National team strength modifiers |

Data is copied from the earlier `fifa_data/` work. Personal data (`draft_data.json` holds Discord IDs) is deliberately not included. Cached provider dumps are excluded too.

## Notes

- Odds shown are bookmaker prices with the margin removed. Title odds are a model approximation.
- The match prediction engine from `fifa_data/` is not included yet, so the site shows market odds and approximations, not engine predictions.
- Nothing here is betting advice.
