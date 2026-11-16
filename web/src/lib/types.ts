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
  generated_at: string;
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
