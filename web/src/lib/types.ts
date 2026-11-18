export type Outcome = { home: number; draw: number; away: number };

export type MatchSummary = {
  id: string;
  competition: string;
  competition_name: string;
  date: string | null;
  stage: string | null;
  group: string | null;
  matchday: number | null;
  status: "completed" | "scheduled";
  home: string;
  away: string;
  home_score: number | null;
  away_score: number | null;
  result: "home" | "away" | "draw" | null;
};

export type Standing = {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

export type ModelResult = Outcome & { likely_score: string };

export type MarketPrices = { home: number; draw: number; away: number };

export type HomeSummary = {
  leagues: number;
  matches_tracked: number;
  completed_count: number;
  upcoming_count: number;
  featured: (MatchSummary & { decimal_odds: MarketPrices; implied_probability: Outcome })[];
  favourites: (MatchSummary & { decimal_odds: MarketPrices; implied_probability: Outcome })[];
  title_race: { team: string; probability: number }[];
  latest_results: MatchSummary[];
  next_fixtures: MatchSummary[];
  insights: HomeInsights;
  generated_at: string;
};

export type OutcomeKey = "home" | "draw" | "away";

export type PredictionRow = {
  id: string;
  date: string | null;
  home: string;
  away: string;
  competition_name: string;
  model_pct: Outcome;
  market_pct: Outcome | null;
  versions: number;
};

export type HomeInsights = {
  overview: {
    pl_leader: { team: string; points: number; played: number } | null;
    fixtures_next_7_days: number;
    fixtures_with_model_runs: number;
    picks_window_days: number;
    model_run_at: string | null;
  };
  model_picks: (PredictionRow & { pick: OutcomeKey; confidence: number; agree: number })[];
  value_gaps: (PredictionRow & { outcome: OutcomeKey; gap: number })[];
  league: {
    table: (Standing & { form: ("W" | "D" | "L")[] })[];
    best_attack: { team: string; goals_per_match: number }[];
    best_defence: { team: string; goals_against_per_match: number }[];
  };
  trends: null | {
    matches: number;
    home_win_pct: number;
    draw_pct: number;
    away_win_pct: number;
    btts_pct: number;
    over_2_5_pct: number;
    clean_sheet_pct: number;
    goals_per_match: number;
  };
  players: null | {
    top_points: PlayerCard[];
    top_form: PlayerCard[];
    top_expected_goals: PlayerCard[];
    availability: { name: string; team: string; status: string; news: string; selected_by_percent: number | null }[];
  };
  formations: null | { clubs: number; note: string; counts: { formation: string; clubs: number; teams: string[] }[] };
  model_performance: {
    in_sample: null | {
      matches: number | null;
      simulations_per_model: number | null;
      caveat: string | null;
      rows: { name: string; accuracy_pct: number | null; brier: number | null; log_loss: number | null; exact_score_hits: number | null }[];
    };
    out_of_sample: null | {
      matches: number;
      model: Interval;
      league_average: Interval;
      uniform: Interval;
      model_minus_league_average: Interval;
      seasons: Record<string, { matches: number; model_log_loss: number; league_average_log_loss: number }>;
    };
  };
  market_snapshot_at: string | null;
};

export type Interval = { mean: number; ci95: [number, number]; n: number };

export type PlayerCard = {
  id: number;
  name: string;
  team: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  price: number;
  total_points: number;
  form: number;
  expected_goals: number;
  selected_by_percent: number;
};

export type UpcomingFixture = {
  id: string;
  date: string | null;
  home: string;
  away: string;
  market: Outcome | null;
  models: Record<string, ModelResult> | null;
};

export type UpcomingResponse = {
  generated_at: string;
  model_run: {
    generated_at: string | null;
    simulations_per_model: number | null;
    fixtures_simulated: number;
    fixtures_total: number;
  };
  gameweeks: { gameweek: number | null; start: string | null; fixtures: UpcomingFixture[] }[];
};

export type PreviousMatch = {
  id: string;
  date: string | null;
  venue: "home" | "away";
  opponent: string;
  opponent_position: number | null;
  score: string;
  result: "W" | "D" | "L";
};

export type LineupSide = {
  team: string;
  manager: string | null;
  formation: string | null;
  predicted_xi: string[] | null;
  predicted_xi_lines: ("GK" | "DEF" | "MID" | "FWD")[] | null;
  xi_source: string | null;
  confidence: number | null;
  notes: string[];
  for_this_match: boolean;
  position: number | null;
  points: number | null;
  played: number | null;
  form: string;
  previous: PreviousMatch[];
};

export type FixtureDetail = {
  id: string;
  competition_name: string;
  date: string | null;
  matchday: number | null;
  status: string;
  home: string;
  away: string;
  market: Outcome | null;
  market_prices: MarketPrices | null;
  models: Record<string, ModelResult> | null;
  models_source: { type: "stored" | "live"; simulations_per_model: number | null } | null;
  lineups: { home: LineupSide; away: LineupSide };
  key_players: { home: KeyPlayer[]; away: KeyPlayer[] };
  injuries: { home: string[] | null; away: string[] | null; note: string };
};

export type TitleOdds = { note: string | null; generated_at: string | null; teams: { team: string; probability: number }[] };

export type MatchOdds = {
  home: string;
  away: string;
  decimal_odds: MarketPrices;
  implied_probability: Outcome;
};

export type WorldCupGroup = { group: string; table: Standing[]; fixtures: MatchSummary[] };

export type TeamProfile = {
  name: string;
  fixtures: MatchSummary[];
  club: null | {
    code: string | null;
    elo: number | null;
    standing: Standing | null;
    title_probability: number | null;
  };
  national: null | { strength_modifier: number | null; tactical_profile: Record<string, unknown> | null };
};

export type FplPlayer = {
  id: number;
  name: string;
  full_name: string;
  team: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  price: number;
  total_points: number;
  points_per_game: number;
  form: number;
  selected_by_percent: number;
  minutes: number;
  goals: number;
  assists: number;
  clean_sheets: number;
  expected_goals: number;
  expected_assists: number;
  ep_next: number;
  status: string;
  news: string;
};
export type PlayersResponse = { count: number; players: FplPlayer[] };

export type KeyPlayer = {
  id: number;
  name: string;
  full_name: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  price: number;
  total_points: number;
  form: number;
  goals: number;
  assists: number;
  status: string;
};
