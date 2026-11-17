# Football build plan

Goal: a football stats and odds site with the same kind of features as OddAlerts,
built on this repo and keeping the black-and-blue design. Football only for now.

Each feature is built, tested and reviewed on its own before the next one starts.

## Status

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Homepage | Done | `/api/home`, big matches, tabs, toolkit, disclaimer |
| 2 | Fixtures and results | Done | `/matches/`, sorted by proximity to today, team dropdown |
| 3 | League tables and team pages | Done | Premier League, World Cup groups, team profiles |
| 4 | Match page | Done | `/match/<id>/` with odds and the six model versions; run models with live progress |
| 5 | AI predictions | Planned | Dixon-Coles model, backtested, prediction log |
| 6 | Value bets | Planned | Model vs market, edge and EV, min odds and edge filters |
| 7 | Dropping odds | Planned | Needs odds snapshots stored over time |
| 8 | Live scores | Planned | Polled every 30–60 s |
| 9 | Trends | Planned | Streak engine per trend type |
| 10 | Filters | Planned | Rule builder, presets, saved filters |
| 11 | Bet builder / accumulators | Planned | Built from market probability ranges |
| 12 | Player stats and compare | Planned | Needs a player data source |
| 13 | Accounts, alerts, email digest | Planned | Needs auth and a mail provider |

## Homepage (feature 1)

- Hero with two calls to action, linking to the Premier League table and all fixtures.
- Four stat tiles: matches tracked, completed, upcoming, leagues.
- "Big matches": the next three Premier League fixtures that have a bookmaker price, with
  home, draw and away probabilities (margin removed).
- "Sharpest numbers" tabs: favourites, title race, latest results, next fixtures.
- Toolkit grid. Live tools link through; planned tools show a "Coming soon" pill.
- Responsible-gambling disclaimer.

Data: `app/data.py::home_summary()`, served at `GET /api/home`. Only real data is used. No
predictions are invented.

Known limits, to fix in feature 4 or 5:
- The "Big matches" and "Favourites" tabs show the probabilities from the odds file. Those are
  market probabilities, not a model.
- Several Premier League fixtures in `pl_matches.json` have dates before today but are still
  marked scheduled. `/api/home` filters them out, so the homepage counts only fixtures dated
  today or later.

## Conventions

- Add a feature as a function in `app/data.py`, an endpoint in `app/routers/api.py`, a renderer
  in `web/src/views/` (Next.js), and styles in `web/src/app/globals.css`.
- Every feature gets a test in `tests/test_api.py`.
- Check each page at 390px wide (for example in an iframe) before calling it done. Headless
  Chrome has a 482px minimum viewport, so a plain 390px screenshot is misleading.
- Keep the design tokens in `:root`. Don't add a new colour without adding a token.

## Data notes

- Odds source for the Premier League is `data/inputs/epl_odds.json`. It has 10 fixtures.
- Title odds are a model approximation in `data/inputs/epl_title_odds.json`.
- Feature 5 will need a model that takes team strength and produces full match probabilities.
  Don't present market probabilities as predictions.
- Check the terms of any odds or stats provider before adding one.
