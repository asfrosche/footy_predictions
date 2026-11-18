# Model layer review and rescoring (2026-11-17)

## What was done

1. Six read-only analysis passes, one per layer group (data inventory; v1; v2; v3 and v4; v5; v6 and vcopy1). Each claim the passes made about a bug was then checked in the code.
2. Fixes applied where the bug was confirmed:
   - **Home advantage was only half applied.** `orchestrator._simulate` added the 45-point bonus to ELO only. The v1 engine averages ELO and PELE, and for the Premier League PELE equals ELO, so the home side received 22.5 points. The bonus now goes into both. This makes the home side's effective shift 45 points.
   - **v6 scored real results against the wrong baseline.** `notify_match` read a stored baseline that only simulated matches create. Real results that were never simulated fell back to a constant 1.2. Baselines are now stored per match, and a real result with no stored baseline is skipped.
3. Market benchmark added to `scripts/score_model_versions.py`. Bookmaker average 1X2 odds from `football-data-E0-2627.csv` are joined to the same 100 completed matches, and the margin is removed.
4. Test suite: 680 passed, 21 skipped, after the fixes.

## Rescored results (100 completed PL matches, 100 simulations per version)

| Model | Accuracy | Brier (lower is better) | Log loss (lower is better) | Exact score hits |
|---|---|---|---|---|
| Bookmaker (average odds, margin removed) | 48% | **0.605** | **1.012** | – |
| vcopy1 | 47% | 0.619 | 1.034 | 12 |
| v1 | 47% | 0.626 | 1.041 | 9 |
| v3 | 46% | 0.660 | 1.104 | 7 |
| v2 | 43% | 0.667 | 1.107 | 8 |
| v4 | 43% | 0.665 | 1.118 | 10 |
| v6 | 43% | 0.673 | 1.116 | 11 |
| v5 | 41% | 0.686 | 1.154 | 10 |
| Uniform 1/3 baseline | – | 0.667 | 1.099 | 0 |

Read the table with these limits:
- **The model scores are in-sample.** The current Elo and form ratings already contain these 100 results. The bookmaker row is a fair comparison, because odds were set before kick-off.
- **Before and after the fixes.** v1 moved from Brier 0.620 to 0.626 and log loss from 1.034 to 1.041. This is the home-advantage fix: the home side now gets the full bonus, and on these 100 matches that was worse, not better. The 800-point strength scale and the other v1 constants are still unfitted.
- Five of the seven versions are no better than the uniform baseline on log loss. Only v1 and vcopy1 beat it, and both are still well behind the bookmaker.

## Findings not yet fixed

These are open, and each needs a decision or a fit against out-of-sample data before it changes the numbers.

- **v5 shootout (confirmed).** `v5_match_state_engine.py` adds the shootout winner to the score (`g1 += 1`). A knockout draw therefore shows as a win. The fix changes how knockout winners are returned, which affects the knockout code. Needs a design decision on the return value.
- **v3 `_compute_xg_deltas` reads the results file directly.** It is not yet confirmed whether the deltas use only matches before each prediction date. The v3 review says they do not. Needs checking before v3 is backtested.
- **v4 game-plan effects add to the team's own xG instead of the opponent's.** Reported by the v3/v4 review, not yet checked line by line in `tactical_analysis.py`.
- **vcopy1 has no World Cup team data.** The book.csv file covers only club matches. The World Cup falls back to a league-average form, and the code references `football_data_E0_2627.csv` as an extra input. Both are reported by the v6/vcopy1 review and not yet verified.
- **v2 xG uses a cubed attack ratio.** It is hand-set and unvalidated (factor 3.0, clamp 0.2–3.0). The v2 review proposes replacing it with a log-linear form fitted on prior seasons.
- **Hand-set constants everywhere.** Momentum, card and energy values, the penalty conversion rate (35% at parity, against about 75% in real shootouts), and the v3 multipliers are not fitted to data.
- **Data gaps.** About 71% of PL players have no FC 26 rating match and use a proxy. The FC 26 ratings and squads are undated snapshots, so they cannot be used for past seasons without leakage.

## Recommended next steps

1. Walk-forward evaluation for each layer against the bookmaker on the 2025-26 and 2026-27 seasons (about 480 matches). Only pre-match ratings should be used.
2. Fit the v1 goal scale and home advantage by Poisson likelihood on prior seasons only, using the football-data CSVs.
3. Decide the shootout return value (see above), then fix the v5 scoreline.
4. Check the v4 target and the v3 delta leakage line by line, then fix them.

## Files changed

- `simulator/services/orchestrator.py`: home bonus applied to ELO and PELE.
- `simulator/engines/v6_evaluation_engine.py`: baselines stored per match, no 1.2 fallback.
- `scripts/score_model_versions.py`: bookmaker benchmark, and a fix to the printed table.
- `data/generated/model_scores_pl.json`: regenerated.
- `docs/model-layer-review-2026-11-17.md`: this file.
