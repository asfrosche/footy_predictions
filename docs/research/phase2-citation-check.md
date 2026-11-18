# Phase 2: citation check for `football-prediction-papers.md`

Checked 2026-11-17. Method: one web search per paper, reading the publisher, repository and abstract records that came back. **No full texts were opened.** Where a paper's numbers or claims could only be checked against a secondary summary, that is stated. Nothing here adds a finding that is not in the source records.

Status key: **Confirmed** = citation and the main claim match a primary or repository record. **Partly** = citation confirmed, a claim in the list is unsupported or differs from the record. **Not found** = no matching record located.

## Results by paper

| # | Paper (as listed) | Status | What the record confirms | What needs correcting in the list |
|---|---|---|---|---|
| 1 | Macrì-Demartino, Egidi & Torelli (2026), JRSS-C | **Not found** | No record located for a JRSS-C 2026 article with this title. The only matching record is arXiv 2508.05891 (paper 2). | Likely the same work as paper 2. Remove or merge until a journal record is found. |
| 2 | Egidi et al. (2025), arXiv 2508.05891 | **Confirmed (authors corrected)** | "Bayesian weighted discrete-time dynamic models for association football prediction", Macrì-Demartino, Egidi & Torelli, submitted 7 Aug 2025. Time-specific commensurate priors on attack and defence; R package footBayes. | Authors are Macrì-Demartino, Egidi and Torelli, not "Egidi et al." One listing gives JRSS-C 2026; unconfirmed. |
| 3 | Wunderlich et al. (2025), *Machine Learning* | **Confirmed** | "Assessing Machine Learning and Data Imputation Approaches to Handle the Issue of Data Sparsity in Sports Forecasting", Machine Learning 2025, doi:10.1007/S10994-024-06651-7. Hybrid and deep models on more than 300,000 soccer matches. | Add the full title and DOI. |
| 4 | Mead, O'Hare & McMenemy (2023), PLOS ONE 18(4) | **Confirmed** | Citation, DOI 10.1371/journal.pone.0282295, CC BY 4.0 (PMC10075453). Abstract: xG was a stronger predictor of future success than traditional statistics. | None. |
| 5 | Chang, Hall & Doan (2023), IJBSR 17(5) | **Confirmed** | Citation and xG-as-input design, benchmarked against bookmaker models and chance. A Poisson-based classifier reached 52.3% accuracy on the 2020–21 PL season. | Add the 52.3% figure, which is the paper's headline result. |
| 6 | Dixon-Coles extension, arXiv 2307.02139 (2023) | **Confirmed (authors and venue corrected)** | "Extending the Dixon and Coles model: an application to women's football data", Michels, Ötting & Karlis, July 2023. Dixon-Coles is a special case of the Sarmanov family. Published in JRSS-C 74(1), 2025, doi:10.1093/jrsssc/qlae050. | Authors: Michels, Ötting & Karlis. Status is peer-reviewed (JRSS-C 2025), not a preprint. Data are women's leagues. |
| 7 | Dependence in football outcomes, arXiv 2103.07272 | **Confirmed (authors corrected)** | "On the dependence in football match outcomes: traditional model assumptions and an alternative proposal", Petretta, Schiavon & Diquigiovanni (Padova). Proposes Mar-Co. Submitted March 2021, revised Dec 2022. Later version in *Statistical Modelling* (year disputed: 2024 or 2025). | Add authors. Update status to "published in Statistical Modelling (2024 or 2025; check)". |
| 8 | Anzer & Bauer (2021), Frontiers 3:624475 | **Confirmed** | Citation and DOI 10.3389/fspor.2021.624475. 105,627 Bundesliga shots. Gradient-boosted (XGBoost) model. RPS 0.197. | None. |
| 9 | Smit, Ravazzolo & Rossini (2021, working paper) | **Partly** | Working paper is "Dynamic Bayesian forecasting of English Premier League match results with the Skellam distribution", Bozen Economics & Management Paper Series No. 72/2020. Dynamic Skellam model with time-varying abilities. | Working paper is dated 2020 with a 2020 series number, not "revised May 2021". The 2018–19 validation claim was not checked. |
| 10 | Whitaker et al. (2021), JRSS-C | **Partly** | Published as "A Bayesian inference approach for determining player abilities in football", JRSS-C 70(1), 174–201, 2021. Authors Whitaker, Silva, Edwards & Kosmidis. Abilities are estimated from 2013/14 and used for over/under 2.5 prediction. | Update the title and author list. The target season (2014/15) for the over/under test was not confirmed. |
| 11 | Groll et al. (2019), JQAS 15(4) | **Partly** | Citation, DOI 10.1515/jqas-2018-0060, pp 271–287. Validation covers all matches from the four World Cups 2002–2014. The 2018 World Cup forecast is where the hybrid model reportedly beat betting odds. | **"Validation set of 64 matches" is not supported** by the record. The list should say the 2002–2014 test covers all matches. The "beat betting odds" claim comes from the 2018 forecast, not the 2002–2014 validation. |
| 12 | Boshnakov, Kharrat & McHale (2017), IJF 33(2) | **Confirmed** | Citation, DOI 10.1016/j.ijforecast.2016.11.006, pp 458–466. Weibull count process with copula. | "Better fit than Poisson, especially for away goals" was not confirmed in the records I could read. Mark as unverified. |
| 13 | Koopman & Lit (2015), JRSS-A 178(1) | **Confirmed** | Citation, pp 167–186. Dynamic bivariate Poisson with time-varying intensities. Out-of-sample test on 2010–11 and 2011–12 PL seasons with a reported profit against bookmaker odds. A 2019 IJF follow-up (vol 35(2), pp 797–809) compares pairwise counts, goal difference and W/D/L across six leagues. | Add the 2019 follow-up citation. The list's claim that the most accurate and most profitable models differ is consistent with the secondary summary. |
| 14 | Constantinou & Fenton (2012), pi-football | **Partly** | Citation confirmed: Constantinou, Fenton & **Neil**, KBS 36, 322–339, DOI 10.1016/j.knosys.2012.07.008. Forecast 2010/11 EPL. | Add Neil to the author list. "Could beat bookmaker odds" is the authors' claim. The records found do not confirm it. Keep it marked as an author claim. |
| 15 | Constantinou & Fenton (2012), RPS paper | **Confirmed** | "Solving the problem of inadequate scoring rules for assessing probabilistic football forecast models", JQAS 8(1), DOI 10.1515/1559-0410.1418. Argues for RPS. | The critique is Wheatcroft (2019), arXiv 1908.08980, "Evaluating probabilistic forecasts of football matches: the case against the Ranked Probability Score". It argues the ignorance score outperforms RPS and Brier in simulation. Name it. |
| 16 | Baio & Blangiardo (2010), J. Applied Statistics 37(2) | **Confirmed** | Citation, pp 253–264. Overshrinkage discussed, with a mixture model as the fix. Tested on Serie A 1991–92 and 2007–08. | None. (It is a journal paper, not a preprint. See the caveats fix below.) |
| 17 | Hvattum & Arntzen (2010), IJF 26(3) | **Confirmed citation; claim partly unsupported** | Citation and DOI 10.1016/j.ijforecast.2009.10.002. Elo ratings as covariates in ordered logit, compared with six benchmark methods. | The list says "English league results". The records do not confirm the dataset. A later paper reports the authors found Elo-based forecasts **clearly inferior to bookmaker odds**. The list omits this, and it matters for the claim that this is the most useful benchmark. |
| 18 | Karlis & Ntzoufras (2003), JRSS-D 52(3) | **Confirmed citation; two claims unverified** | Citation, pp 381–393. Bivariate Poisson with a shared component. | "The authors later introduced a diagonal-inflated version" was not confirmed. Check whether it is in the 2003 paper itself. "204 matches" is from the list's own project data and is not reconciled with the audit's figures. |
| 19 | Dixon & Coles (1997), JRSS-C 46(2) | **Confirmed** | Citation, pp 265–280. Parametric model fitted to English league and cup data 1992–95. Bookmaker odds for 1995–96 gave a positive return. | The low-score correction and time weighting are from a blog and the paper's own description, not the abstract I read. Mark as "per secondary summary" until the full text is checked. |
| 20 | Maher (1982), Statistica Neerlandica 36(3) | **Confirmed citation; data claim unverified** | Citation, DOI 10.1111/j.1467-9574.1982.tb00782.x, pp 109–118. Independent Poisson reasonably accurate. Bivariate Poisson with correlation about 0.2 improves fit. | "Rothmans Football Yearbook, 1973–75, 12 leagues" was not confirmed. |

## Corrections to make in `football-prediction-papers.md`

1. Merge papers 1 and 2 into one entry (arXiv 2508.05891, Macrì-Demartino, Egidi & Torelli). Paper 1's JRSS-C 2026 record was not found.
2. Paper 6: authors are Michels, Ötting & Karlis. Status is JRSS-C 2025, not a 2023 preprint.
3. Paper 7: add authors Petretta, Schiavon & Diquigiovanni.
4. Paper 11: remove "validation set of 64 matches". Say that the 2002–2014 test covers all matches, and that the betting-odds comparison is from the 2018 forecast.
5. Paper 17: add that the authors found Elo-based forecasts clearly inferior to bookmaker odds.
6. Paper 15: name Wheatcroft (2019) as the critic.
7. Caveats section: it says "Five of the ten (14, 16, 17, 18, 19)", but the list has twenty papers. Papers 16, 17, 18 and 19 are journal articles, not preprints. Paper 6 is now peer-reviewed (JRSS-C 2025). The preprints and working papers are 2, 7 and 9, plus 1 if it turns out to be a separate preprint.
8. Notes section: the "Rathke 2017" reference in "Data points that matter" is not one of the twenty papers. Either add it to the list with a verified citation or remove it.

## Problems in the list that are not about citations

- "Four PL seasons" (paper 7 note) disagrees with the audit, which counts three completed seasons plus 2026/27.
- "204 matches (PL and WC)" (paper 18 note) disagrees with the audit's 1,120 pooled walk-forward matches. The two numbers are on different data and should not be compared.

## What Phase 2 does not establish

- None of the findings in the list has been reproduced on this project's data. Each entry is a test to run, not a result.
- Claims about profits, beating bookmakers and better fit are reported by the authors, and the records I read do not confirm them independently.
- Full texts were not opened, so any number quoted above from an abstract or secondary summary should be checked against the paper before it is used in a report.
