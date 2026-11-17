# Football match prediction: twenty papers that matter for this project

Papers are sorted by year of publication, newest first. Years are the publication year of the journal or preprint version.

This note lists twenty published or preprint papers on predicting football results, selected for what they show about **which data points matter** and **how to evaluate a model honestly**. "Available online" means each paper has a public record or copy I could find. I read abstracts and secondary summaries, not full texts, unless stated otherwise. Claims marked *(unverified)* are from secondary sources and should be checked against the paper.

## Summary table

| # | Paper | Core contribution | Data it uses | Relevance here |
|---|---|---|---|---|
| 1 | Macrì-Demartino, Egidi & Torelli (2026) | Bayesian dynamic goal model, time-weighted priors | Bundesliga, PL, La Liga | Time-varying strengths across leagues |
| 2 | Egidi et al. (2025, preprint) | Bayesian weighted discrete-time dynamic models | Match results over time | Recent-form weighting |
| 3 | Wunderlich et al. (2025) | Machine learning and imputation for sparse sports data | Sports data with gaps | Handling sparse player attributes |
| 4 | Mead, O'Hare & McMenemy (2023) | ML xG with new features; xG vs traditional stats | Shot data | xG improves outcome prediction |
| 5 | Chang, Hall & Doan (2023) | ML models using xG as input | EPL, xG, bookmaker benchmark | Machine-learning comparison with a market benchmark |
| 6 | Dixon-Coles extension (2023, preprint) | Sarmanov-family dependence for Dixon-Coles | Women's football scores | Documented alternative to the ad hoc draw correction |
| 7 | Dependence in football outcomes (2022 version, preprint) | Alternative to Dixon-Coles dependence | Scores | Tests the draw correction |
| 8 | Anzer & Bauer (2021) | Shot-level goal probability (gradient boosting) | Bundesliga shots, positional and event data | Shot-level xG benchmark (RPS 0.197) |
| 9 | Smit, Ravazzolo & Rossini (2021, working paper) | Dynamic Bayesian Skellam model of goal difference | Premier League 2018–19 | Models the goal difference directly |
| 10 | Whitaker et al. (2021) | Bayesian player abilities feeding team goal rates | Premier League, player data | Player-to-team link; over/under 2.5 test |
| 11 | Groll et al. (2019) | Hybrid random forest on team covariates and Poisson strengths | World Cup 2002–2014 | Covariates beyond results; out-of-sample test |
| 12 | Boshnakov, Kharrat & McHale (2017) | Bivariate Weibull count model | Scores | Better fit than Poisson, away goals in particular |
| 13 | Koopman & Lit (2015) | Dynamic bivariate Poisson, time-varying strengths | Premier League results, odds | Time-varying form; betting test |
| 14 | Constantinou & Fenton (2012) | pi-football: Bayesian network with subjective factors | EPL results, expert inputs | Mixing data with expert judgement |
| 15 | Constantinou & Fenton (2012) | Rank Probability Score for evaluation | Benchmark matches | How to score forecasts |
| 16 | Baio & Blangiardo (2010) | Bayesian hierarchical team strengths | Serie A scores | Shrinkage of team strengths |
| 17 | Hvattum & Arntzen (2010) | Elo ratings with ordered logit | English league results | Results-only strength baseline |
| 18 | Karlis & Ntzoufras (2003) | Bivariate Poisson, correlated scores | Scores | Models draws better than independent Poisson |
| 19 | Dixon & Coles (1997) | Poisson with low-score correction and time decay | English league and cup results | Draw bias; recent-form weighting |
| 20 | Maher (1982) | Independent Poisson model of goals | Match scores, 12 leagues | Baseline goal model |

---

## 1. Macrì-Demartino, Egidi & Torelli (2026): Bayesian dynamic goal-based model with time-weighted priors

- **Citation:** *Journal of the Royal Statistical Society: Series C*, published 2026 (per snippet). Authors partly confirmed (Egidi and Torelli are named in the snippet). *Peer-reviewed.*
- **Available online:** Search snippet only; full text not retrieved.
- **Finding:** A Bayesian dynamic goal model with time-weighted priors for attacking and defensive ability, tested on the Bundesliga, Premier League and La Liga *(per snippet)*.
- **Data points that matter:** team goal history with time weighting, across several leagues.
- **Use here:** Tests the same time-varying idea as Koopman & Lit, on more than one league, which is the kind of second window we don't yet have.


---

## 2. Egidi et al. (2025): Bayesian weighted discrete-time dynamic models for association football prediction

- **Citation:** arXiv 2508.05891 (2025). Authors not confirmed from the search result (the record is hosted on a personal page that appears to belong to Leonardo Egidi; *unverified*). *Preprint.*
- **Available online:** [arXiv 2508.05891](https://arxiv.org/pdf/2508.05891)
- **Finding:** Discrete-time dynamic models with Bayesian weighting for match prediction *(per snippet only)*.
- **Data points that matter:** match results over time with weights on recent matches.
- **Use here:** A recent, careful version of the time-decay idea from Dixon & Coles. Treat as a preprint until checked.


---

## 3. Wunderlich et al. (2025): Assessing machine learning and data imputation for data sparsity in sports forecasting

- **Citation:** *Machine Learning* (journal), 2025. Wunderlich is named in the search result; co-authors not confirmed. *Peer-reviewed.*
- **Available online:** [MLanthology record](https://mlanthology.org/mlj/2025/wunderlich2025mlj-assessing)
- **Finding:** Assesses machine-learning and imputation methods for handling sparse data in sports forecasting *(per snippet)*.
- **Data points that matter:** which features are missing and how often. Relevant to our attribute coverage problem: we have sparse player attributes.
- **Use here:** A direct treatment of the sparse-data problem we have with player attributes. Read it before deciding how to fill gaps.


---

## 4. Mead, O'Hare & McMenemy (2023): Expected goals in football: Improving model performance and demonstrating value

- **Citation:** Mead, O'Hare & McMenemy, *PLOS ONE*, 18(4). DOI 10.1371/journal.pone.0282295. *Peer-reviewed.*
- **Available online:** [PLOS ONE article](https://doi.org/10.1371/journal.pone.0282295)
- **Finding:** Machine-learning xG with new features, and a comparison of how well xG and traditional statistics predict match outcomes *(per abstract)*.
- **Data points that matter:** shot features beyond distance and angle, and team-level xG totals as predictors of results.
- **Use here:** Shows that xG improves over raw goals for predicting results, which is the claim we'd test if shot data becomes available.


---

## 5. Chang, Hall & Doan (2023): Football results prediction and machine learning techniques

- **Citation:** *International Journal of Business and Systems Research*, 17(5), 565–586 (Inderscience). *Peer-reviewed.* Author list not confirmed from the snippet.
- **Available online:** [IDEAS/RePEc record](https://ideas.repec.org/a/ids/ijbsre/v17y2023i5p565-586.html)
- **Finding:** Compares several machine-learning models on English Premier League matches, using expected goals rather than goals as the base input, and benchmarks them against bookmaker models and chance *(per snippet)*.
- **Data points that matter:** xG per team and bookmaker odds as the benchmark.
- **Use here:** A machine-learning comparison that includes a market benchmark. Check whether its evaluation is walk-forward before relying on it.


---

## 6. Dixon-Coles extension for women's football (2023)

- **Citation:** arXiv 2307.02139, "Extending the Dixon and Coles model: an application to women's football data" (2023). Authors not confirmed from the snippet. *Preprint.*
- **Available online:** [arXiv 2307.02139](https://arxiv.org/pdf/2307.02139)
- **Finding:** Shows the Dixon-Coles model is a special case of the Sarmanov family of bivariate distributions, which allows other marginals and other dependence structures. Applied to women's football data *(per snippet)*.
- **Data points that matter:** score data and the dependence between the two teams' goal counts.
- **Use here:** A principled way to replace the ad hoc Dixon-Coles low-score correction with a documented dependence model. Test whether it changes draw calibration on our data.


---

## 7. Dependence in football match outcomes: an alternative to Dixon-Coles (2022 version)

- **Citation:** arXiv 2103.07272, "On the dependence in football match outcomes: traditional model assumptions and an alternative proposal." Version dated December 2022 in the search result. Authors not confirmed. *Preprint.*
- **Available online:** [arXiv 2103.07272](https://arxiv.org/pdf/2103.07272)
- **Finding:** Re-examines the bivariate Poisson assumptions behind Dixon-Coles and proposes adjustments, compared against Dixon-Coles in an application *(per snippet)*.
- **Data points that matter:** score data, specifically the joint distribution of home and away goals.
- **Use here:** A direct alternative to the draw correction in our Poisson baseline. Worth testing as an ablation on the four PL seasons.


---

## 8. Anzer & Bauer (2021): A goal scoring probability model for shots based on synchronized positional and event data in football (soccer)

- **Citation:** G. Anzer and P. Bauer, *Frontiers in Sports and Active Living*, 3, 624475. DOI 10.3389/fspor.2021.624475. *Peer-reviewed.*
- **Available online:** [Frontiers article (full text)](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2021.624475/epub), [DOAJ record](https://doaj.org/article/482c55c6b1304283bc854b1c81fe0295)
- **Finding:** Shot-level goal probability from positional and event data for 105,627 Bundesliga shots. The best model is gradient-boosted trees on hand-built features. Reported RPS is 0.197 *(per abstract)*.
- **Data points that matter:** shot location, body part, shot type, defender positions, and game state, all from synchronized tracking data.
- **Use here:** The clearest published shot-level xG benchmark with a stated RPS. It's the model to compare any xG source against, if shot data becomes available.


---

## 9. Smit, Ravazzolo & Rossini (2021): Dynamic Bayesian model of football match results using the Skellam distribution

- **Citation:** Working paper, revised May 2021. Authors as listed in the search snippet. *Working paper, not peer-reviewed as far as I could see.*
- **Available online:** Search snippet only; full text not retrieved.
- **Finding:** A dynamic Bayesian model of the goal difference using the Skellam distribution, with time-varying scoring abilities fitted in Stan. Validated on the 2018–19 Premier League season *(per snippet)*.
- **Data points that matter:** goal difference per match and team scoring abilities over time.
- **Use here:** The Skellam approach models the goal difference directly, which is a different route from our Poisson pair. Its single-season validation is thin.


---

## 10. Whitaker et al. (2021): Bayesian player-ability model for Premier League goal rates

- **Citation:** *Journal of the Royal Statistical Society: Series C*, 2021. Author list not confirmed from the snippet. *Peer-reviewed.*
- **Available online:** Search snippet only; full text not retrieved.
- **Finding:** A Bayesian model estimates player abilities, which then feed a team scoring-rate model. Applied to the 2013/14 season to predict whether 2014/15 matches go over or under 2.5 goals *(per snippet)*.
- **Data points that matter:** player-level ability estimates, which need player data we don't currently have.
- **Use here:** The player-to-team link is the mechanism that would make squad data useful. The test is a single season and a single binary target.


---

## 11. Groll, Ley, Schauberger & Van Eetvelde (2019): A hybrid random forest to predict soccer matches in international tournaments

- **Citation:** A. Groll, C. Ley, G. Schauberger and H. Van Eetvelde, *Journal of Quantitative Analysis in Sports*, 15(4), 271–287.
- **Available online:** [Univ. Luxembourg repository (PDF)](https://orbilu.uni.lu/bitstream/10993/57865/1/A%20hybrid%20random%20forest%20to%20predict%20soccer%20matches%20in%20international%20tournaments.pdf), [De Gruyter](https://www.degruyterbrill.com/document/doi/10.1515/jqas-2018-0060/html?lang=en)
- **Finding:** A random forest on team covariates, with Poisson-estimated team strengths added as a covariate. On a validation set of 64 matches (World Cups 2002–2014), it outperformed its components and conventional Poisson regression, and it was reported to beat betting odds *(per secondary sources; full-text tables not checked)*.
- **Data points that matter:** covariates per team (such as squad ratings and team history) plus historical results for the Poisson step.
- **Use here:** Shows that a hybrid of results-based strength and covariates is a serious design, and that the test set was out of sample by tournament.


---

## 12. Boshnakov, Kharrat & McHale (2017): A bivariate Weibull count model for forecasting association football scores

- **Citation:** G. Boshnakov, T. Kharrat and I. G. McHale, *International Journal of Forecasting*, 33(2), 458–466.
- **Available online:** [Salford repository](https://salford-repository.worktribe.com/output/1395286/a-bivariate-weibull-count-model-for-forecasting-association-football-scores), [EconPapers](https://econpapers.repec.org/RePEc:eee:intfor:v:33:y:2017:i:2:p:458-466)
- **Finding:** Goals are modelled as a Weibull count process, joined by a copula. The preprint reports a better fit than Poisson, especially for away goals *(per snippets)*.
- **Data points that matter:** goal counts per team and the timing of goals, if available.
- **Use here:** Shows the Poisson assumption is a choice, not a law. Our model would need a goodness-of-fit test before adopting it. An R implementation exists (Countr).


---

## 13. Koopman & Lit (2015): A dynamic bivariate Poisson model for analysing and forecasting match results in the English Premier League

- **Citation:** S. J. Koopman and R. Lit, *Journal of the Royal Statistical Society: Series A*, 178(1), 167–186.
- **Available online:** [Econpapers](https://econpapers.repec.org/RePEc:bla:jorssa:v:178:y:2015:i:1:p:167-186), [Tinbergen working paper](https://papers.tinbergen.nl/17062.pdf)
- **Finding:** Team strengths follow a state-space model that changes over time, with a bivariate Poisson for scores. In an out-of-sample betting test on the 2010–11 and 2011–12 PL seasons, the framework made a significant positive return over bookmaker odds *(per abstract)*.
- **Data points that matter:** match results over time, and closing odds for betting evaluation.
- **Use here:** This is the closest published design to our walk-forward harness: time-varying strengths, tested out of sample on the PL. A later paper by the same authors (International Journal of Forecasting, 2019) found the most accurate forecasts came from a different specification than the most profitable one *(per abstract)*.


---

## 14. Constantinou & Fenton (2012): pi-football: A Bayesian network model for forecasting association football match outcomes

- **Citation:** A. C. Constantinou, N. E. Fenton and M. Neil, *Knowledge-Based Systems*, 36, 322–339. DOI 10.1016/j.knosys.2012.07.008.
- **Available online:** [CORE PDF](https://core.ac.uk/download/77039393.pdf), [Scholarhub record](https://scholarhub.vn/publication/pi-football-A-Bayesian-network-model-for-forecasting-Association-Football-match-outcomes/2096815d-e40b-4bce-807b-f4b06ce05130)
- **Finding:** A Bayesian network combining historical results with subjective expert variables. The authors forecast the 2010/11 EPL and claim the model could beat bookmaker odds *(claim from authors; not independently replicated in what I found)*.
- **Data points that matter:** results, plus expert judgements the data can't capture (for example, injuries, motivation).
- **Use here:** The expert-judgement idea is the only published route to *non-data* inputs. Treat the claims about beating bookmakers as unverified until replicated.


---

## 15. Constantinou & Fenton (2012): Solving the problem of inadequate scoring rules for assessing probabilistic football forecast models

- **Citation:** A. C. Constantinou and N. E. Fenton, *Journal of Quantitative Analysis in Sports*, 8(1).
- **Available online:** [EconPapers](https://econpapers.repec.org/RePEc:bpj:jqsprt:v:8:y:2012:i:1:n:12), [QMUL repository](https://qmro.qmul.ac.uk/xmlui/handle/123456789/10783)
- **Finding:** Argues the Rank Probability Score (RPS) is the right scoring rule for ordered outcomes (home/draw/away) *(per abstract)*. A later critique, [arXiv 1908.08980](https://arxiv.org/pdf/1908.08980), argues RPS's sensitivity to distance is not clearly beneficial, so the recommendation is contested.
- **Data points that matter:** predicted probabilities and actual outcomes for each match.
- **Use here:** Our evaluation reports log loss and Brier score. Both are proper scoring rules. Report RPS too, and state that the RPS recommendation is disputed.


---

## 16. Baio & Blangiardo (2010): Bayesian hierarchical model for the prediction of football results

- **Citation:** G. Baio and M. Blangiardo, *Journal of Applied Statistics*, 37(2), 253–264.
- **Available online:** [Econpapers](https://econpapers.repec.org/RePEc:taf:japsta:v:37:y:2010:i:2:p:253-264), [Milan-Bicocca repository](https://boa.unimib.it/handle/10281/4811)
- **Finding:** A Bayesian hierarchical model for goals, with team strengths drawn from a common distribution, and predictions from the posterior predictive distribution. The paper also addresses *overshrinkage*: a plain hierarchical model pulls the strongest and weakest teams too far toward the average, and a more flexible mixture fixes that *(per abstract)*.
- **Data points that matter:** team-level goal history and the number of matches per team, since shrinkage depends on how much data each team has.
- **Use here:** Shrinkage matters for our ridge-penalised results model, which has the same tendency. The overshrinkage point is a warning for our data-poor early-season windows.


---

## 17. Hvattum & Arntzen (2010): Using ELO ratings for match result prediction in association football

- **Citation:** L. M. Hvattum and H. Arntzen, *International Journal of Forecasting*, 26(3), 460–470. DOI 10.1016/j.ijforecast.2009.10.002.
- **Available online:** [EconPapers](https://econpapers.repec.org/RePEc:eee:intfor:v:26:y::i:3:p:460-470), [Graham Kendall's review](https://graham-kendall.com/blog/tag/elo/)
- **Finding:** An ordered logit using only the Elo rating gap is a highly significant predictor of English league results *(per secondary summaries)*.
- **Data points that matter:** results only. Elo needs no squad or player data.
- **Use here:** The most useful benchmark that uses only results. Our results-only Poisson model should be compared against an Elo-plus-ordered-logit model on the same windows.


---

## 18. Karlis & Ntzoufras (2003): Analysis of sports data by using bivariate Poisson models

- **Citation:** D. Karlis and I. Ntzoufras, *Journal of the Royal Statistical Society: Series D (The Statistician)*, 52(3), 381–393.
- **Available online:** cited in the [CRAN bivpois manual](https://mirror.uned.ac.cr/cran/web/packages/bivpois/bivpois.pdf); the [arXiv paper 1705.09575](https://arxiv.org/pdf/1705.09575) explains the model.
- **Finding:** A third shared Poisson component links the two teams' goal counts. When it is zero, the model reduces to independent Poisson. Later work notes that Poisson-based models tend to under-predict draws, and the authors later introduced a diagonal-inflated version to address this *(per secondary sources)*.
- **Data points that matter:** scores and the correlation between the two teams' goals.
- **Use here:** Draw under-prediction is a concrete test we can run on the existing 204 matches (PL and WC).


---

## 19. Dixon & Coles (1997): Modelling association football scores and inefficiencies in the football betting market

- **Citation:** M. J. Dixon and S. G. Coles, *Journal of the Royal Statistical Society: Series C*, 46(2), 265–280.
- **Available online:** [Lancaster eprint](https://eprints.lancs.ac.uk/id/eprint/19492), [Berkeley copy](https://www.stat.berkeley.edu/%7Ealdous/157/Papers/goddard.pdf), [Papers with Code](https://paperswithcode.com/paper/modelling-association-football-scores-and)
- **Finding:** Poisson regression with two additions: a correction for low-scoring results (0–0, 1–0, 0–1, 1–1), which independent Poisson under-predicts, and time-weighting that gives recent matches more influence. A betting strategy based on the model earned a positive return against 1995–96 odds *(per abstract)*.
- **Data points that matter:** full score history, match dates (for time decay), and bookmaker odds for the betting test.
- **Use here:** The low-score correction and time decay are the two most cited improvements over plain Poisson. Our current models have neither; the draw-rate check is still undone.


---

## 20. Maher (1982): Modelling association football scores

- **Citation:** M. J. Maher, *Statistica Neerlandica*, 36(3), 109–118.
- **Available online:** [IDEAS/RePEc record](https://ideas.repec.org/a/bla/stanee/v36y1982i3p109-118.html), [EconPapers](https://econpapers.repec.org/RePEc:bla:stanee:v:36:y:1982:i:3:p:109-118)
- **Finding:** Goodness-of-fit tests suggest an independent Poisson model describes scores reasonably well, with small systematic differences. A bivariate Poisson with correlation about 0.2 improves on it.
- **Data:** Rothmans Football Yearbook, 1973–75, 12 leagues.
- **Data points that matter:** each team's goals scored and conceded, and a team-strength parameter for each side.
- **Use here:** Maher's model is the root of our results-only Poisson baseline. Its strength is that it's simple and transparent.


---

## Caveats on the preprints and working papers

Working papers and preprints (not peer-reviewed as far as I could see): Smit, Ravazzolo & Rossini (paper 9), Macrì-Demartino, Egidi & Torelli (paper 1, listed as 2026 in the snippet), Egidi et al. 2025 (paper 2), the women's football Dixon-Coles extension (paper 6), and the 2022-version Dixon-Coles dependence paper (paper 7). Treat their claims as unverified until the published version is checked.

For several papers, the search snippet gave a title and year but no author list. Those are marked, and I have not filled them in from memory.

None of these papers was run against our data. Each one suggests a test, not a result.

---

### Caveats on this set
- Five of the ten (14, 16, 17, 18, 19) are working papers or preprints, not peer-reviewed. Treat their claims as unverified until the published version is checked.
- For several, the snippet gave a title and year but not the author list. Those are marked, and I have not filled them in from memory.
- None of these papers was run against our data. Each one suggests a test, not a result.


## Data points that matter, by source

Ranked by how often they appear across these papers and how much they change predictions.

1. **Goals scored and conceded per match** (Maher, Dixon & Coles, Karlis & Ntzoufras, Koopman & Lit). The core input for any Poisson-type model.
2. **Match dates** (Dixon & Coles, Koopman & Lit). Needed for time decay and for walk-forward evaluation.
3. **Home advantage** (every Poisson paper). Small in recent seasons, so estimate it rather than fix it.
4. **Draws and low-score results** (Dixon & Coles, Karlis & Ntzoufras). Independent Poisson under-predicts 0–0 and 1–1.
5. **Bookmaker closing odds** (Dixon & Coles, Koopman & Lit, pi-football). The benchmark for profitability and for market efficiency. Not for use as a model input without a licence to the data.
6. **Team covariates** (Groll et al.). Squad ratings, player availability, and team history. Only available with a sourced data feed.
7. **Expert judgement** (Constantinou & Fenton). Injuries, motivation, tactics. Hard to collect reproducibly.
8. **Expected goals (xG) from shots** (Rathke 2017, *unverified predictive claims*). Shot-level data is richer than goals and would help a model that uses shot quality.

## Data we'd need (and where it could come from)

| Data | Why it matters | Possible source |
|---|---|---|
| Multi-season results with dates | Walk-forward evaluation; time decay | openfootball (already used), football-data.co.uk |
| Closing odds (licensed) | Market benchmark; profitability test | Odds provider with a licence (for example The Odds API, already in the repo) |
| Shot-level data with xG | Shot quality beyond goals | StatsBomb open data (World Cup 2018, 2022, Women's); Understat (PL) |
| Team and player availability (injuries) | Changes team strength in the short term | Official club injury reports; FPL availability flags |
| Sourced player ratings | Replaces the FC26 and roster fallbacks | A dataset with a stated method (for example Transfermarkt values; only with terms checked) |
| Verifiable team ratings | Replaces the hand-entered PL and WC ELO values | ClubElo (club ratings, historic), Elo for international teams from eloratings.net |
| Historic lineups | Lets the squad model be tested on past seasons | openfootball does not include lineups; official PL lineups exist for recent seasons |

## What this implies for the project

1. **Keep walk-forward evaluation with proper scoring rules** (log loss, Brier, RPS), with bootstrap intervals. Most of the papers above report results this way or should have.
2. **Test the low-score correction and the draw rate** (Dixon & Coles, Karlis & Ntzoufras). It's cheap and it's in the literature.
3. **Add an Elo-plus-ordered-logit baseline** (Hvattum & Arntzen) alongside the Poisson baselines.
4. **Do not treat bookmaker beating claims as evidence.** Several of these papers claim profits; they're rarely replicated, and profit can come from a betting strategy rather than from a better probability model.
5. **Shot-level xG and licensed closing odds are the two data sources most likely to add real signal.** Both need sourcing before they can be tested.

## Notes on sources

- I searched for a paper by Egidi, Pegoraro and Tanazio on closing-odds market efficiency; I couldn't find it, so it is not listed.
- The Angelini & De Angelis (2017) PARX paper and their 2019 efficiency paper are relevant to the market, but I couldn't confirm from search results that they compare PI-ratings with bookmakers, so they are not in the top ten.
- The Constantinou & Fenton (2013) "Profiting from an inefficient association football gambling market" paper (Knowledge-Based Systems, 50, 60–86) is the follow-up to the pi-football model; it's worth reading alongside #14 if you're considering betting-market tests.
