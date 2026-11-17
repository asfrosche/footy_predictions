# Footy Predictions

Football fixtures, results, league tables, market odds and model results for the Premier League and the World Cup.

- **Backend:** FastAPI (`app/`), serving JSON under `/api`.
- **Frontend:** Next.js and TypeScript (`web/`), built to static files and served by FastAPI.
- **Model:** six match-engine versions, v1 to v6 (`simulator/`), run per fixture on the Premier League.

## Layout

| Folder | What it holds |
|---|---|
| `app/` | The API: `main.py` (app and site), `routers/api.py` (endpoints), `data.py` (loads and derives data), `live_odds.py` (The Odds API client), `model_runner.py` (runs v1 to v6), `legacy/` (the SIPOC page) |
| `web/` | The Next.js site. `npm run build` writes it to `web/out/`, which FastAPI serves |
| `simulator/` | The engines v1 to v6 and their competition configs. Only the parts the site uses are kept here |
| `data/inputs/` | Fixtures, ratings and odds the site reads |
| `data/generated/` | Written by the scripts: the live odds cache and stored model results |
| `data/backups/` | Backups made before results are rewritten. Git-ignored |
| `scripts/` | Refreshing results and odds, and running the models |
| `tests/` | API, live odds and lineup script tests |
| `simulator/tests/` | Engine and data-loading tests |
| `archive/` | Tools the site does not use (the Discord draft bot, odds watchers, benchmark reports, evaluation). Kept for reference, not run |
| `docs/` | The build plan and the logo source |

## Set up

```bash
python -m venv .venv
.venv\Scripts\activate            # Git Bash: source .venv/Scripts/activate
pip install -r requirements-dev.txt

cd web
npm install
```

Copy `.env.example` to `.env` if you want live odds. `.env` is git-ignored.

## Run

Build the site. The build reads the fixture and team lists from the API, so start the API first:

```bash
uvicorn app.main:app --port 8765    # terminal 1
cd web && npm run build             # terminal 2, once the API is up
```

Then open http://127.0.0.1:8765. Each new Premier League fixture needs a rebuild to get its match page. Data updates do not.

For development with hot reload, keep the API running and start the Next.js dev server:

```bash
cd web
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8765 npm run dev -- --port 3001
```

## Data

| Task | Command |
|---|---|
| Refresh finished results | `python scripts/fetch_football_data.py 2627` then `python scripts/refresh_results.py --write` |
| Live odds (uses credits) | set `ODDS_SOURCE=the_odds_api` and `ODDS_API_KEY` in `.env`, then `python scripts/fetch_odds.py --confirm` |
| Stored model results (about 30 minutes) | `python scripts/run_model_predictions.py` |

Set `FOOTY_DATA_DIR` to read data from another folder.

## Test

```bash
python -m pytest tests
```

## Notes

- Odds are bookmaker prices with the margin removed. Model results are simulations, not guarantees.
- Nothing here is betting advice.
- The Discord draft data is not in the repo. It holds personal IDs and stays on the machine that uses it.
