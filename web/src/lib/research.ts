// Research references shown on /research/. Details are taken from the verification in
// docs/research/phase2-citation-check.md. Where a claim was only seen in an abstract or a
// secondary summary, `note` says so. Nothing here is a result from this project's own data.

export type Status = "Confirmed" | "Partly confirmed" | "Preprint";

export type Paper = {
  id: string;
  title: string;
  authors: string;
  venue: string;
  year: string;
  status: Status;
  finding: string;
  use: string;
  note?: string;
  url: string | null;
};

export const PAPERS: Paper[] = [
  {
    id: "dixon-coles-1997",
    title: "Modelling association football scores and inefficiencies in the football betting market",
    authors: "M. J. Dixon & S. G. Coles",
    venue: "Journal of the Royal Statistical Society: Series C, 46(2), 265–280",
    year: "1997",
    status: "Confirmed",
    finding:
      "A Poisson-based model fitted to English league and cup results from 1992–95. A betting strategy built on it returned a profit against 1995–96 odds.",
    use: "The standard Poisson refinement: a low-score correction and time weighting for recent form.",
    note: "The low-score correction and time weighting are from secondary summaries, not from the abstract.",
    url: "https://eprints.lancs.ac.uk/id/eprint/19492",
  },
  {
    id: "maher-1982",
    title: "Modelling association football scores",
    authors: "M. J. Maher",
    venue: "Statistica Neerlandica, 36(3), 109–118",
    year: "1982",
    status: "Confirmed",
    finding:
      "An independent Poisson model describes football scores reasonably well. A bivariate Poisson with correlation of about 0.2 improves the fit.",
    use: "The root of the results-only Poisson baseline in this project.",
    url: "https://doi.org/10.1111/j.1467-9574.1982.tb00782.x",
  },
  {
    id: "karlis-ntzoufras-2003",
    title: "Analysis of sports data by using bivariate Poisson models",
    authors: "D. Karlis & I. Ntzoufras",
    venue: "Journal of the Royal Statistical Society: Series D, 52(3), 381–393",
    year: "2003",
    status: "Confirmed",
    finding:
      "A shared third Poisson component links the two teams' goal counts. With no shared component the model reduces to independent Poisson.",
    use: "A test for draw under-prediction in the current models.",
    note: "The claim that Poisson models under-predict draws comes from secondary sources and has not been checked against the paper.",
    url: null,
  },
  {
    id: "hvattum-arntzen-2010",
    title: "Using ELO ratings for match result prediction in association football",
    authors: "L. M. Hvattum & H. Arntzen",
    venue: "International Journal of Forecasting, 26(3), 460–470",
    year: "2010",
    status: "Partly confirmed",
    finding:
      "Elo ratings are used as covariates in an ordered logit model and compared against six benchmark methods. Bookmaker-based methods were the strongest comparators.",
    use: "A results-only benchmark that needs no squad data.",
    note: "A later paper reports that the authors found Elo-based forecasts clearly inferior to bookmaker odds. The dataset used is not confirmed.",
    url: "https://doi.org/10.1016/j.ijforecast.2009.10.002",
  },
  {
    id: "baio-blangiardo-2010",
    title: "Bayesian hierarchical model for the prediction of football results",
    authors: "G. Baio & M. Blangiardo",
    venue: "Journal of Applied Statistics, 37(2), 253–264",
    year: "2010",
    status: "Confirmed",
    finding:
      "A Bayesian hierarchical goal model with team strengths drawn from a common distribution. It identifies overshrinkage of the strongest and weakest teams, which a mixture model corrects. Tested on Serie A 1991–92 and 2007–08.",
    use: "A warning about shrinkage in data-poor periods such as the start of a season.",
    url: "https://boa.unimib.it/handle/10281/4811",
  },
  {
    id: "koopman-lit-2015",
    title: "A dynamic bivariate Poisson model for analysing and forecasting match results in the English Premier League",
    authors: "S. J. Koopman & R. Lit",
    venue: "Journal of the Royal Statistical Society: Series A, 178(1), 167–186",
    year: "2015",
    status: "Confirmed",
    finding:
      "Team scoring intensities change over time within a bivariate Poisson. An out-of-sample test on the 2010–11 and 2011–12 Premier League seasons reported a positive return against bookmaker odds.",
    use: "The closest published design to this project's walk-forward evaluation.",
    note: "A 2019 follow-up (International Journal of Forecasting, 35(2), 797–809) found that the most accurate forecasts came from a different specification than the most profitable one.",
    url: "https://econpapers.repec.org/RePEc:bla:jorssa:v:178:y:2015:i:1:p:167-186",
  },
  {
    id: "constantinou-fenton-2012-pi",
    title: "pi-football: A Bayesian network model for forecasting association football match outcomes",
    authors: "A. C. Constantinou, N. E. Fenton & M. Neil",
    venue: "Knowledge-Based Systems, 36, 322–339",
    year: "2012",
    status: "Partly confirmed",
    finding:
      "A Bayesian network that combines historical results with subjective expert variables. The authors forecast the 2010/11 Premier League.",
    use: "The only published route into non-data inputs such as injuries and motivation.",
    note: "The authors claim the model could beat bookmaker odds. That claim is not independently replicated in the sources checked.",
    url: "https://doi.org/10.1016/j.knosys.2012.07.008",
  },
  {
    id: "constantinou-fenton-2012-rps",
    title: "Solving the problem of inadequate scoring rules for assessing probabilistic football forecast models",
    authors: "A. C. Constantinou & N. E. Fenton",
    venue: "Journal of Quantitative Analysis in Sports, 8(1)",
    year: "2012",
    status: "Confirmed",
    finding:
      "Argues that the Rank Probability Score suits ordered outcomes (home, draw, away) better than the scoring rules used in earlier work.",
    use: "Why this project reports the Rank Probability Score alongside log loss and the Brier score.",
    note: "The recommendation is disputed. Wheatcroft (2019, arXiv 1908.08980) argues that the ignorance score does better in simulation.",
    url: "https://doi.org/10.1515/1559-0410.1418",
  },
  {
    id: "boshnakov-2017",
    title: "A bivariate Weibull count model for forecasting association football scores",
    authors: "G. Boshnakov, T. Kharrat & I. G. McHale",
    venue: "International Journal of Forecasting, 33(2), 458–466",
    year: "2017",
    status: "Confirmed",
    finding:
      "Goals are modelled as a Weibull count process, with a copula linking the two teams' counts.",
    use: "Shows the Poisson assumption is a choice. A fit test is needed before adopting any alternative.",
    note: "The claim of a better fit than Poisson, especially for away goals, was not confirmed in the sources checked.",
    url: "https://econpapers.repec.org/RePEc:eee:intfor:v:33:y:2017:i:2:p:458-466",
  },
  {
    id: "groll-2019",
    title: "A hybrid random forest to predict soccer matches in international tournaments",
    authors: "A. Groll, C. Ley, G. Schauberger & H. Van Eetvelde",
    venue: "Journal of Quantitative Analysis in Sports, 15(4), 271–287",
    year: "2019",
    status: "Partly confirmed",
    finding:
      "A random forest on team covariates, with Poisson-estimated team strengths added as a covariate. Tested on all matches from the 2002–2014 World Cups, which is an out-of-sample split by tournament.",
    use: "Shows that results-based strength combined with covariates is a serious design.",
    note: "The reported beating of betting odds comes from the 2018 World Cup forecast, not from the 2002–2014 test.",
    url: "https://www.degruyterbrill.com/document/doi/10.1515/jqas-2018-0060/html?lang=en",
  },
  {
    id: "anzer-bauer-2021",
    title: "A goal scoring probability model for shots based on synchronized positional and event data in football (soccer)",
    authors: "G. Anzer & P. Bauer",
    venue: "Frontiers in Sports and Active Living, 3, 624475",
    year: "2021",
    status: "Confirmed",
    finding:
      "Shot-level goal probability from positional and event data for 105,627 Bundesliga shots. The best model is gradient-boosted trees with a reported RPS of 0.197.",
    use: "The shot-level xG benchmark to compare any xG source against.",
    url: "https://doi.org/10.3389/fspor.2021.624475",
  },
  {
    id: "smit-ravazzolo-rossini-2020",
    title: "Dynamic Bayesian forecasting of English Premier League match results with the Skellam distribution",
    authors: "R. C. Smit, F. Ravazzolo & L. Rossini",
    venue: "Bozen Economics & Management Paper Series, No. 72/2020 (working paper)",
    year: "2020",
    status: "Preprint",
    finding:
      "A dynamic Bayesian model of the goal difference using the Skellam distribution, with team scoring abilities that change over the season.",
    use: "Models the goal difference directly, which is a different route from the Poisson pair.",
    note: "A working paper, not peer-reviewed as far as the sources show. The 2018–19 validation was not checked.",
    url: "https://repec.unibz.it/bemps72.pdf",
  },
  {
    id: "whitaker-2021",
    title: "A Bayesian inference approach for determining player abilities in football",
    authors: "G. A. Whitaker, R. Silva, D. Edwards & I. Kosmidis",
    venue: "Journal of the Royal Statistical Society: Series C, 70(1), 174–201",
    year: "2021",
    status: "Partly confirmed",
    finding:
      "Player abilities are estimated with a Poisson model and feed a team scoring-rate model. Abilities from the 2013/14 Premier League season are used to predict over or under 2.5 goals.",
    use: "The player-to-team link that would make squad data useful.",
    note: "The season the over/under test covers was not confirmed.",
    url: "https://econpapers.repec.org/RePEc:bla:jorssc:v:70:y:2021:i:1:p:174-201",
  },
  {
    id: "mead-2023",
    title: "Expected goals in football: Improving model performance and demonstrating value",
    authors: "J. Mead, A. O'Hare & P. McMenemy",
    venue: "PLOS ONE, 18(4), e0282295",
    year: "2023",
    status: "Confirmed",
    finding:
      "Machine-learning expected goals with new features. The authors report that xG predicts future team success better than traditional statistics.",
    use: "Supports the case for xG as an input once shot data is available.",
    url: "https://doi.org/10.1371/journal.pone.0282295",
  },
  {
    id: "chang-hall-doan-2023",
    title: "Football results prediction and machine learning techniques",
    authors: "V. Chang, K. Hall & L. M. T. Doan",
    venue: "International Journal of Business and Systems Research, 17(5), 565–586",
    year: "2023",
    status: "Confirmed",
    finding:
      "Machine-learning models on English Premier League matches, using expected goals as the base input and benchmarked against bookmaker models and chance. A Poisson-based classifier reached 52.3% accuracy on the 2020–21 season.",
    use: "A machine-learning comparison that includes a market benchmark.",
    note: "The full text is paywalled. The evaluation method was not confirmed as walk-forward.",
    url: "https://ideas.repec.org/a/ids/ijbsre/v17y2023i5p565-586.html",
  },
  {
    id: "michels-otting-karlis-2025",
    title: "Extending the Dixon and Coles model: an application to women's football data",
    authors: "R. Michels, M. Ötting & D. Karlis",
    venue: "arXiv 2307.02139 (2023); Journal of the Royal Statistical Society: Series C, 74(1), 2025",
    year: "2025",
    status: "Confirmed",
    finding:
      "Shows the Dixon-Coles model is a special case of the Sarmanov family of bivariate distributions, which allows other marginals and dependence structures. Applied to women's league data.",
    use: "A documented replacement for the ad hoc Dixon-Coles correction, to test on our own draw rate.",
    url: "https://arxiv.org/abs/2307.02139",
  },
  {
    id: "petretta-schiavon-diquigiovanni-2021",
    title: "On the dependence in football match outcomes: traditional model assumptions and an alternative proposal",
    authors: "M. Petretta, L. Schiavon & J. Diquigiovanni",
    venue: "arXiv 2103.07272; later in Statistical Modelling",
    year: "2021",
    status: "Preprint",
    finding:
      "Questions the Poisson marginals and the dependence structure behind Dixon-Coles, and proposes the Mar-Co model, which relaxes both.",
    use: "An alternative to the draw correction to test as an ablation.",
    note: "The year of the journal version is disputed in the sources (2024 or 2025).",
    url: "https://arxiv.org/abs/2103.07272",
  },
  {
    id: "macri-demartino-egidi-torelli-2025",
    title: "Bayesian weighted discrete-time dynamic models for association football prediction",
    authors: "R. Macrì-Demartino, L. Egidi & N. Torelli",
    venue: "arXiv 2508.05891 (2025)",
    year: "2025",
    status: "Preprint",
    finding:
      "Lets team attack and defence strengths change over time with commensurate priors. The authors report better predictive performance than other discrete-time dynamic models, and a shorter computation time.",
    use: "The time-varying strength idea, in a Bayesian form.",
    note: "A journal listing gives JRSS-C 2026. That was not confirmed.",
    url: "https://arxiv.org/abs/2508.05891",
  },
  {
    id: "wunderlich-2025",
    title: "Assessing machine learning and data imputation approaches to handle the issue of data sparsity in sports forecasting",
    authors: "F. Wunderlich et al.",
    venue: "Machine Learning (2025), doi:10.1007/S10994-024-06651-7",
    year: "2025",
    status: "Confirmed",
    finding:
      "Hybrid and deep-learning models tested on more than 300,000 soccer matches. Imputation is assessed as a way to handle missing data.",
    use: "A direct treatment of the sparse player-attribute problem this project has.",
    url: "https://mlanthology.org/mlj/2025/wunderlich2025mlj-assessing",
  },
];

// The evaluation status of this project's models. Numbers are from the Phase 1 audit
// (docs/research/phase1-audit.md) and are not comparable to bookmaker figures on other matches.
export const EVALUATION = {
  walkForward: {
    model: "Results-only Poisson benchmark",
    matches: 1120,
    seasons: "2023/24 to 2026/27",
    logLoss: 1.016,
    leagueAverageLogLoss: 1.076,
    diff: -0.06,
    ci: "−0.087 to −0.033",
  },
  caveats: [
    "The walk-forward benchmark is the only out-of-sample result in the repository. It is a results-only model, not the six production versions.",
    "The six production versions have not yet been tested out of sample against bookmaker odds.",
    "The bookmaker comparison in the model review is in-sample (100 matches the ratings already contain), so it cannot be compared with the walk-forward figures.",
    "Simulation counts of 100 per version are too small to separate close versions reliably. This has not yet been quantified.",
  ],
};

export type DataSource = {
  name: string;
  url: string | null;
  licence: string;
  status: "Usable" | "Check terms" | "Not used";
  use: string;
};

export const DATA_SOURCES: DataSource[] = [
  {
    name: "openfootball (England, Premier League results)",
    url: "https://github.com/openfootball/england",
    licence: "CC0 public domain (secondary listings; LICENSE file not yet opened)",
    status: "Usable",
    use: "Match results with dates. Already in use.",
  },
  {
    name: "StatsBomb open data",
    url: "https://github.com/statsbomb/open-data",
    licence: "Free to use with attribution, under StatsBomb's terms",
    status: "Usable",
    use: "Shot and event data for selected tournaments. Not Premier League.",
  },
  {
    name: "Club-Football-Match-Data (odds and Elo)",
    url: "https://github.com/xgabora/Club-Football-Match-Data",
    licence: "MIT for the code. Its odds come from Football-Data.co.uk and its Elo from ClubElo, whose terms are not yet checked",
    status: "Check terms",
    use: "Odds and Elo history. Elo rows after June 2025 are a generated continuation, not real history.",
  },
  {
    name: "ClubElo",
    url: "http://clubelo.com/",
    licence: "Terms not yet read",
    status: "Check terms",
    use: "Dated team Elo ratings. Would replace hand-entered Elo values.",
  },
  {
    name: "Football-Data.co.uk",
    url: "https://www.football-data.co.uk/",
    licence: "Terms not yet read",
    status: "Check terms",
    use: "Results and closing odds for the Premier League.",
  },
  {
    name: "Transfermarkt and FBref",
    url: null,
    licence: "Scraping is restricted or unlicensed according to the sources checked",
    status: "Not used",
    use: "Not used for player ratings until their terms are read and permission is obtained.",
  },
];
