# Footy Predictions

Football fixtures, results, league tables, player stats, predicted lineups, market odds and model results for the Premier League and the World Cup.

- **Backend:** FastAPI (`app/`), serving JSON under `/api`.
- **Frontend:** Next.js and TypeScript (`web/`), built to static files and served by FastAPI.
- **Models:** seven match-engine versions, v1 to v6 and vcopy1 (`simulator/`), run per fixture on the Premier League.
- **Lineups:** a predicted starting XI for each club's next match (`simulator/services/lineup_prediction.py`).

## Layout

| Folder | What it holds |
|---|---|
| `app/` | The API: `main.py` (app and site), `routers/api.py` (endpoints), `data.py` (loads and derives data), `live_odds.py` (The Odds API client), `model_runner.py` (runs the seven models), `legacy/` (the SIPOC page) |
| `api/` | Vercel entry point. `api/index.py` exposes the FastAPI app |
| `web/` | The Next.js site. `npm run build` writes it to `web/out/`, which FastAPI serves |
| `simulator/` | The engines v1 to v6 and vcopy1, the competition configs, the lineup service and its data |
| `data/inputs/` | Fixtures, ratings, odds and history the site reads |
| `data/generated/` | Written by the scripts (git-ignored): FPL players, livescore cross-check, predicted lineups, live odds cache, stored model results |
| `data/raw/` | Raw downloads from the data sources (git-ignored) |
| `data/backups/` | Backups made before results are rewritten (git-ignored) |
| `scripts/` | Refreshing results, players, odds and model results, and checking the data |
| `tests/` | API, live odds and lineup script tests |
| `simulator/tests/` | Engine, lineup-prediction and data-loading tests |
| `archive/` | Tools the site does not use (the Discord draft bot, odds watchers, benchmark reports). Kept for reference, not run |
| `docs/` | The build plan, website notes, research notes and the logo source |

## Set up

```bash
python -m venv .venv
.venv\Scripts\activate            # Git Bash: source .venv/Scripts/activate
pip install -r requirements-dev.txt

cd web
npm install
```

Copy `.env.example` to `.env` if you want live odds. `.env` is git-ignored and must not be committed or deployed.

## Run

Build the site. The build reads the fixture and team lists from the API, so start the API first:

```bash
uvicorn app.main:app --port 8765    # terminal 1
cd web && npm run build             # terminal 2, once the API is up
```

Then open http://127.0.0.1:8765. Pages for new fixtures appear after a rebuild. Data updates on the API do not need one, but the static match pages do, so rebuild after refreshing data.

For development with hot reload, keep the API running and start the Next.js dev server:

```bash
cd web
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8765 npm run dev -- --port 3001
```

## Data

| Task | Command |
|---|---|
| Refresh finished results | `python scripts/fetch_football_data.py 2627` then `python scripts/refresh_results.py --write` |
| Premier League players (Fantasy Premier League, free, no key) | `python scripts/fetch_fpl_data.py` |
| Livescore cross-check (free, no key) | `python scripts/fetch_livescore_data.py` |
| Check the sources agree with our data | `python scripts/verify_data.py` (exit 0 when every check passes) |
| Predicted lineups for the next matches | `python -m simulator.scripts.export_lineups` (needs the FPL file above) |
| Live odds (uses credits) | set `ODDS_SOURCE=the_odds_api` and `ODDS_API_KEY` in `.env`, then `python scripts/fetch_odds.py --confirm` |
| Stored model results (about 30 minutes for a full season) | `python scripts/run_model_predictions.py --sims 200` |

Results from `run_model_predictions.py` are saved after every fixture, so a stopped run resumes where it left off. Adding a version reuses the stored runs for the others.

Set `FOOTY_DATA_DIR` to read data from another folder.

### Sources

- **Results and tables:** football-data.co.uk CSV files, and the livescore feed for the cross-check.
- **Players and availability:** the official Fantasy Premier League API (`bootstrap-static`). It gives positions, prices, form, minutes, status and chance of playing.
- **Odds:** bundled odds in `data/inputs/`, or live odds from The Odds API when a key is set.

## Lineups

The predicted XI for each club's next match starts from the XI in its last completed match, then:

1. leaves out players who are injured, suspended, unavailable or below 50% to play (FPL data);
2. rests a low-minutes starter after a turnaround of 3 days or less, at most two per club;
3. replaces each player who will not start with the best fit squad player at the same position line, so the team's shape stays the same;
4. keeps one goalkeeper, even when the squad data holds the same keeper twice;
5. keeps the last match's formation.

Each prediction has a confidence score and notes that say what changed. The notes also flag players from the last match who are missing from the squad data. The match page shows the prediction only for the club's next match.

The rules and thresholds are judgement calls, not tested against team sheets. Confirmed team sheets are not used.

## Deploy (Vercel)

`vercel.json` sends every request to `api/index.py`, which serves the API and the built site. Before deploying:

1. build the site (`cd web && npm run build`, with the API running);
2. deploy from the project folder with the Vercel CLI.

`.vercelignore` keeps secrets, git history, raw data, tests, scripts and the web sources out of the upload. Live odds (`data/generated/odds_live.json`) are excluded for licensing reasons, so the deployed site uses the bundled odds.

## Test

```bash
python -m pytest
```

The root `pytest.ini` runs `tests/` and `simulator/tests/`.

## Notes

- Odds are bookmaker prices with the margin removed. Model results are simulations, not guarantees.
- Nothing here is betting advice.
- The Discord draft data is not in the repo. It holds personal IDs and stays on the machine that uses it.
