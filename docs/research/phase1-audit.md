# Phase 1: codebase audit (FootyPredictions)

Scope: read-only audit. No prediction logic has been changed. Claims below were checked in the code unless marked *(from docs, not re-checked)*.

## 1. Architecture

- `app/` FastAPI backend. Serves the built static site from `web/out` and the JSON API. `app/model_runner.py` runs the seven model versions (`v1`–`v6`, `vcopy1`) on one fixture.
- `web/` Next.js static export (`output: "export"`). All data is loaded in the browser from `/api`.
- `simulator/` engines, services, models, benchmark and tests (about 10k lines in `engines/` and `services/`).
- `data/inputs/` committed inputs: odds, team ratings, Premier League results, tactical profiles, the 2023/24–2025/26 history files.
- `data/generated/` outputs: `lineups.json`, `model_scores_pl.json`, `pl_walkforward.json`, `fpl_players.json`, `model_predictions.json`.
- No database. All state is JSON files and CSVs. There is no research/paper store.

## 2. Model inventory

| Version | Purpose | Method (as read in code) | Inputs | Status |
|---|---|---|---|---|
| v1 Elo | Match probabilities | Elo and PELE averaged, then a match result model | Elo ratings, home bonus | Production (in the six-version display) |
| v2 Player | Player-level strength | Attack ratio raised to `curve_factor` (default 3.0), clamped to `[curve_min, curve_max]` | FC 26 player ratings, squads | Production; the curve is hand-set |
| v3 Dynamic | Dynamic modifiers | Chemistry, experience, form, momentum, continuity, leadership, plus national modifiers | Squads, results file | Production; see leakage finding |
| v4 Tactical | Tactical xG adjustment | Pressing, rigidity and game-plan adjustments, clamped to a fixed % of base xG | Tactical profiles | Production; not verified line by line |
| v5 Match state | Goal-by-goal simulation | Phase-based Poisson goal draws, events, substitutions, penalties | Engines above | Production; shootout bug below |
| v6 Adaptive | V5 with live per-team xG corrections | Baselines stored per match (after the 2026-11-17 fix) | Real results | Experimental: a live tournament layer |
| vcopy1 | Neural network | Port of a 2018 TensorFlow model, trained on `book.csv` (2008–2018) | Club match CSV | Experimental |
| Results-only Poisson | Benchmark | Attack/defence ratings and home advantage, fitted walk-forward | Results only | Benchmark (`simulator/benchmark/pl_walkforward.py`) |

## 3. Verified findings

### Confirmed bugs or design defects

1. **v5 shootout scoreline** (`simulator/engines/v5_match_state_engine.py:200,202`). After a penalty shootout the winner's goal count is incremented (`g1 += 1`). A knockout draw is stored as a win on the scoreline. Needs a decision on the return value before fixing.
2. **v3 xG deltas use all completed matches** (`simulator/engines/v3_dynamic_engine.py`, `_compute_xg_deltas`). The function reads every completed match in the file once, with no date cutoff. Any backtest that uses this engine would therefore use future results. This is a leakage risk, not a fixed-date feature. It is not safe to backtest v3 until it takes a `before_date` argument.
3. **Penalty conversion** (`simulator/services/penalty_engine.py:92`). The success probability is `(taker/keeper) * 0.35` at parity. Real shootout conversion is about 75%. Hand-set, unfitted.
4. **v2 curve** (`simulator/engines/v2_player_engine.py:167–168`). `attack_ratio ** 3.0`, clamped. Hand-set, unvalidated.

### Reported by the existing review but not re-checked in this phase

- v4 game-plan effects possibly added to the team's own xG rather than the opponent's (`simulator/services/tactical_analysis.py`). *(from docs, not re-checked)*
- vcopy1 has no World Cup team data and falls back to league-average form. The code does have a `fallback_teams` mechanism (`vcopy1_engine.py:251–257`), so the behaviour is real; the data gap itself is *(from docs)*.

### Evaluation status

- `docs/model-layer-review-2026-11-17.md` scores seven versions against the bookmaker on **100 in-sample matches**. The bookmaker (Brier 0.605, log loss 1.012) beats every model. Five of seven versions are no better than uniform on log loss. These scores are in-sample: the ratings already contain those results.
- `simulator/benchmark/pl_walkforward.py` (stored in `data/generated/pl_walkforward.json`) is the only out-of-sample evaluation in the repo:
  - Results-only Poisson, pooled over 1,120 matches (2023/24–2026/27): log loss 1.016 against 1.076 for the league average (difference −0.060, 95% CI −0.087 to −0.033). Brier difference −0.044, CI −0.063 to −0.026.
  - Per season, log-loss advantage over league average is about −0.09 (2023/24), −0.08 (2024/25) and −0.03 (2025/26, CI includes zero).
  - V3 goal level on 2026/27 (60 matches): unscaled error 0.119 (CI −0.33 to 0.52), scaled error 0.204 (CI −0.24 to 0.60). Neither is distinguishable from zero. The fitted scale did not help.
- No production engine (v1–v6) has been walk-forward evaluated against the bookmaker. The walk-forward model's pooled numbers and the bookmaker's in-sample numbers are on different matches and must not be compared directly.

### Data

- Player ratings: about 71% of Premier League players have no FC 26 match and use a proxy (`docs/model-layer-review-2026-11-17.md`). The FC 26 snapshot is undated, so it cannot be used for past seasons without leakage. *(from docs, not re-checked)*
- Historical results cover three completed Premier League seasons in `data/inputs/history/`, plus 2026/27 from the repo.
- No match-level event, xG or shot data is in the repo. Expected goals in the engines is model-derived, not observed.
- No formation or tactical data is recorded. Tactical profiles are hand-written per team (`data/inputs/tactical_profiles.json`).

### Research library

- None. There is no research entity, route or table. `docs/research/football-prediction-papers.md` lists twenty papers, but its own header says the author read abstracts and secondary summaries, and marks several claims *(unverified)*. None of its citations has been checked against the source in this phase.

## 4. Architecture issues

- **Duplicated scoring logic.** Home advantage was applied to Elo in one place and to PELE in another until the 2026-11-17 fix. Other duplicates are likely across v1–v5 and should be listed during Phase 4.
- **Hand-set constants.** Momentum, card and energy values, penalty rates, v2 curve, v3 multipliers and the v1 800-point scale are all unfitted.
- **No separation of probability generation.** Each version produces its own probabilities; no calibration layer exists.
- **In-sample evaluation.** `model_scores_pl.json` is scored on matches the ratings already contain. Any tuning against it is leakage.
- **Simulation count.** 100 simulations per version in the rescoring run. Monte Carlo noise at that count is large relative to the differences between versions; this has not been quantified.

## 5. Prioritised issues

1. **v3 leakage** (confirmed). Add a date cutoff before any v3 backtest.
2. **Out-of-sample evaluation of production versions.** Walk-forward v1–v6 against the same test matches and the bookmaker. Without this, no change can be judged.
3. **v5 shootout scoreline** (confirmed). Decide the return value, then fix.
4. **Fit the v1 scale and home advantage** on prior seasons only, by Poisson likelihood.
5. **Verify the v4 attribution** line by line.
6. **Replace hand-set constants** (penalty rate, v2 curve, momentum and card values) with fitted values, each tested out of sample.
7. **Data:** source a dated player-rating history, and match-level xG if it can be licensed. Document what cannot be obtained.
8. **Research library and citation verification** (Phase 2 and Phase 6). Nothing is built yet.

## 6. Open items

- Full test suite (`python -m pytest`): 707 passed, 21 skipped, 0 failed (run on the current working tree, 37 s). The 2026-11-17 review reported 680 passed, so the suite has grown since.
- Phase 2 (research verification) and Phase 3 (data provider assessment) have not started. They need web access and source checks, which were not part of this phase.
