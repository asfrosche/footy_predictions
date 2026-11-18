"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/api";
import { fmtDate, fmtPct, pathSegment } from "@/lib/format";
import type { HomeSummary, MatchSummary } from "@/lib/types";
import { Bars, Crest, Empty, ErrorBox, Loading, MatchRow, OutcomeBar, ProbRow, TeamLink } from "@/components/ui";
import {
  AvailabilityList,
  FormationBars,
  LeagueTable,
  ModelScoreTable,
  OutOfSampleHeadline,
  PickCard,
  PlayerRanking,
  RankCard,
  RankItem,
  SectionHead,
  TrendTile,
  Unavailable,
  ValueList,
} from "@/components/HomeSections";

const TABS = ["favourites", "title", "results", "fixtures"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { favourites: "Favourites", title: "Title race", results: "Results", fixtures: "Fixtures" };

// Live pages. Each one is a real tool that already exists.
const TOOLKIT = [
  { title: "Fixtures", text: "Every match, filterable by competition, status and team.", href: "/matches/" },
  { title: "Premier League", text: "League table, title race and match odds with the margin removed.", href: "/premier-league/" },
  { title: "Upcoming", text: "Upcoming fixtures by gameweek, with the seven model versions.", href: "/upcoming/" },
  { title: "Players", text: "Fantasy Premier League player stats, filtered and sorted.", href: "/players/" },
  { title: "World Cup", text: "Group tables built from each group's own fixtures.", href: "/world-cup/" },
  { title: "Research", text: "The papers, walk-forward results and data sources behind the models.", href: "/research/" },
];

// Planned. Each says what is missing, so nobody mistakes it for a working feature.
const PLANNED = [
  { title: "Odds movement", text: "Opening against current prices. Needs repeated odds snapshots, and we keep only the latest." },
  { title: "Live scores", text: "In-play scores. A feed is cached in the repo but not yet wired to any page." },
  { title: "Corners and cards", text: "Needs match-level stats we do not hold yet." },
  { title: "Alerts", text: "Email or app alerts when a model pick or a price changes." },
];

function FavouriteRow({ m }: { m: HomeSummary["favourites"][number] }) {
  const p = m.implied_probability;
  const side = p.home >= p.away ? "home" : "away";
  const name = side === "home" ? m.home : m.away;
  return (
    <div className="fav-row">
      <div className="fav-main">
        <div className="team-name">
          <TeamLink team={name} />
        </div>
        <div className="faint small">
          {m.home} v {m.away} · {fmtDate(m.date)}
        </div>
      </div>
      <span className="score mono">{fmtPct(p[side])}</span>
    </div>
  );
}

// The next priced fixture, shown beside the hero so the top of the page carries live numbers.
function Spotlight({ m }: { m: HomeSummary["featured"][number] }) {
  const p = m.implied_probability;
  const side = p.home >= p.away ? "home" : "away";
  return (
    <Link prefetch={false} className="spot" href={`/match/${pathSegment(m.id)}/`}>
      <div className="spot-top">
        <span className="pill">{m.competition_name}</span>
        <span className="faint small">{fmtDate(m.date)}</span>
      </div>
      <div className="spot-teams">
        <span className="spot-team">
          <Crest team={m.home} large />
          <span>{m.home}</span>
        </span>
        <span className="vs">vs</span>
        <span className="spot-team">
          <Crest team={m.away} large />
          <span>{m.away}</span>
        </span>
      </div>
      <OutcomeBar p={p} />
      <ProbRow p={p} />
      <div className="spot-foot small">
        <span className="muted">Most likely: {side === "home" ? m.home : m.away}</span>
        <span className="mono">{fmtPct(p[side])}</span>
      </div>
    </Link>
  );
}

export function HomeView() {
  const { data: s, error } = useApi<HomeSummary>("/home", 60);
  const [tab, setTab] = useState<Tab>("favourites");

  if (error) return <ErrorBox message={error.message} />;
  if (!s) return <Loading />;

  const ins = s.insights;
  const trends = ins.trends;
  const oos = ins.model_performance.out_of_sample;
  const inSample = ins.model_performance.in_sample;
  const uniformRow = inSample?.rows.find((r) => r.name === "uniform_reference");

  const panels: Record<Tab, React.ReactNode> = {
    favourites: s.favourites.length ? s.favourites.map((m) => <FavouriteRow key={m.id} m={m} />) : <Empty>No priced fixtures yet.</Empty>,
    title: s.title_race.length ? (
      <>
        <div className="card-head">
          <span className="muted small">Model approximation</span>
        </div>
        <Bars items={s.title_race} />
      </>
    ) : (
      <Empty>No sourced title odds yet, so no title race is shown.</Empty>
    ),
    results: s.latest_results.length ? s.latest_results.map((m: MatchSummary) => <MatchRow key={m.id} m={m} />) : <Empty>No results yet.</Empty>,
    fixtures: s.next_fixtures.length ? s.next_fixtures.map((m: MatchSummary) => <MatchRow key={m.id} m={m} />) : <Empty>No upcoming fixtures.</Empty>,
  };

  return (
    <>
      <section className="hero hero-grid">
        <div className="hero-copy">
          <img className="hero-logo" src="/img/logo.png" alt="Footy Predictions" width={72} height={72} />
          <span className="eyebrow">Football stats &amp; odds</span>
          <h1>
            Match probabilities, <span className="text-gradient">straight from the prices.</span>
          </h1>
          <p>
            Fixtures, results, tables, player data and bookmaker odds for the Premier League and World Cup. Each
            probability comes from the odds with the margin removed, or from seven model versions run on each match.
          </p>
          <div className="hero-actions">
            <Link prefetch={false} className="btn primary" href="/upcoming/">
              Model picks
            </Link>
            <Link prefetch={false} className="btn" href="/premier-league/">
              Premier League
            </Link>
          </div>
        </div>
        {s.featured[0] ? <Spotlight m={s.featured[0]} /> : null}
      </section>

      <div className="stats stats-6">
        <div className="stat">
          <div className="stat-label">Matches tracked</div>
          <div className="stat-value mono">{s.matches_tracked}</div>
          <div className="stat-sub">Completed and upcoming</div>
        </div>
        <div className="stat">
          <div className="stat-label">Completed</div>
          <div className="stat-value mono">{s.completed_count}</div>
          <div className="stat-sub">Full-time results</div>
        </div>
        <div className="stat">
          <div className="stat-label">Upcoming</div>
          <div className="stat-value mono">{s.upcoming_count}</div>
          <div className="stat-sub">Fixtures still to play</div>
        </div>
        <div className="stat">
          <div className="stat-label">Next 7 days</div>
          <div className="stat-value mono">{ins.overview.fixtures_next_7_days}</div>
          <div className="stat-sub">Premier League kick-offs</div>
        </div>
        <div className="stat">
          <div className="stat-label">With model runs</div>
          <div className="stat-value mono">{ins.overview.fixtures_with_model_runs}</div>
          <div className="stat-sub">Seven versions per fixture</div>
        </div>
        <div className="stat">
          <div className="stat-label">League leader</div>
          <div className="stat-value stat-value-text">{ins.overview.pl_leader ? ins.overview.pl_leader.team : "–"}</div>
          <div className="stat-sub">
            {ins.overview.pl_leader ? `${ins.overview.pl_leader.points} pts from ${ins.overview.pl_leader.played}` : "No results yet"}
          </div>
        </div>
      </div>

      <div className="section-head">
        <h2>Big matches</h2>
        <span className="muted small">Next priced fixtures · home, draw, away</span>
      </div>
      <div className="big-grid">
        {s.featured.length > 1 ? (
          s.featured.slice(1).map((m) => (
            <article className="big-match" key={m.id}>
              <div className="big-match-top">
                <span className="pill">{m.competition_name}</span>
                <span className="faint">{fmtDate(m.date)}</span>
              </div>
              <div className="big-match-teams">
                <span className="team-name home">
                  <TeamLink team={m.home} />
                </span>
                <span className="vs">vs</span>
                <span className="team-name away">
                  <TeamLink team={m.away} />
                </span>
              </div>
              <OutcomeBar p={m.implied_probability} />
              <ProbRow p={m.implied_probability} />
            </article>
          ))
        ) : (
          <Empty>No other priced fixtures coming up.</Empty>
        )}
      </div>

      <div className="home-block">
        <SectionHead
          id="model-picks"
          title="Model picks"
          note={`Next ${ins.overview.picks_window_days} days · ranked by how far the seven versions agree`}
          href="/upcoming/"
          linkLabel="All gameweeks"
        />
        {ins.model_picks.length ? (
          <div className="pick-grid">
            {ins.model_picks.map((m) => (
              <PickCard key={m.id} m={m} />
            ))}
          </div>
        ) : (
          <Empty>No fixtures in the next {ins.overview.picks_window_days} days have model runs yet.</Empty>
        )}
      </div>

      <div className="home-block">
        <SectionHead
          id="value"
          title="Model against the bookmaker"
          note="Largest gaps in the next 14 days · model minus bookmaker"
          href="/upcoming/"
          linkLabel="See fixtures"
        />
        {ins.value_gaps.length ? <ValueList rows={ins.value_gaps} /> : <Empty>No priced fixtures in the next 14 days.</Empty>}
        <p className="note-box small">
          A gap shows where the model and the bookmaker disagree. On the {inSample?.matches ?? "scored"} matches we have
          checked, the bookmaker was better calibrated than every model version, so treat a gap as a question to check,
          not a bet.
        </p>
      </div>

      <div className="home-block">
        <SectionHead
          id="league"
          title="League intelligence"
          note="Premier League table, last five results, and goals per match"
          href="/premier-league/"
          linkLabel="Full table"
        />
        <div className="league-grid">
          <LeagueTable rows={ins.league.table} />
          <div className="rank-grid">
            <RankCard title="Best attacks" note="Goals scored per match">
              {ins.league.best_attack.map((r, i) => (
                <RankItem key={r.team} rank={i + 1} team={r.team} value={r.goals_per_match.toFixed(2)} />
              ))}
            </RankCard>
            <RankCard title="Best defences" note="Goals conceded per match">
              {ins.league.best_defence.map((r, i) => (
                <RankItem key={r.team} rank={i + 1} team={r.team} value={r.goals_against_per_match.toFixed(2)} />
              ))}
            </RankCard>
          </div>
        </div>
        <div className="unavailable-row">
          <Unavailable title="Expected goals by team" reason="Team xG needs a match-level feed we do not hold yet, so attack and defence use actual goals." />
        </div>
      </div>

      <div className="home-block">
        <SectionHead id="trends" title="Statistical trends" note={trends ? `Premier League, ${trends.matches} completed matches` : "Premier League"} />
        {trends ? (
          <div className="trend-grid">
            <TrendTile label="Home wins" pct={trends.home_win_pct} />
            <TrendTile label="Draws" pct={trends.draw_pct} />
            <TrendTile label="Away wins" pct={trends.away_win_pct} />
            <TrendTile label="Both teams to score" pct={trends.btts_pct} />
            <TrendTile label="Over 2.5 goals" pct={trends.over_2_5_pct} />
            <TrendTile label="Clean sheets" pct={trends.clean_sheet_pct} note="Share of team performances" />
            <div className="tile trend-tile">
              <span className="stat-label">Goals per match</span>
              <span className="trend-value mono">{trends.goals_per_match.toFixed(2)}</span>
              <span className="faint small">Across all completed matches</span>
            </div>
            <Unavailable title="Corners" reason="No corner counts in our match data." />
            <Unavailable title="Cards" reason="No card counts in our match data." />
          </div>
        ) : (
          <Empty>No completed Premier League matches yet.</Empty>
        )}
      </div>

      <div className="home-block">
        <SectionHead id="players" title="Player intelligence" note="Fantasy Premier League data, season to date" href="/players/" linkLabel="All players" />
        {ins.players ? (
          <div className="player-grid">
            <PlayerRanking title="Most points" rows={ins.players.top_points} value={(p) => `${p.total_points} pts`} />
            <PlayerRanking title="In form" rows={ins.players.top_form} value={(p) => p.form.toFixed(1)} />
            <PlayerRanking title="Expected goals" rows={ins.players.top_expected_goals} value={(p) => p.expected_goals.toFixed(2)} />
            <div className="card rank-card">
              <h3>Availability</h3>
              <span className="faint small">Flagged players, most owned first</span>
              <AvailabilityList rows={ins.players.availability} />
            </div>
          </div>
        ) : (
          <Empty>Player data has not been fetched yet.</Empty>
        )}
      </div>

      <div className="home-block">
        <SectionHead id="tactics" title="Tactical insights" note="Predicted formations across the Premier League" href="/premier-league/" linkLabel="Clubs" />
        <div className="tactics-grid">
          {ins.formations ? (
            <div className="card">
              <h3>Formation landscape</h3>
              <span className="faint small">{ins.formations.note}</span>
              <FormationBars rows={ins.formations.counts} max={ins.formations.counts[0]?.clubs ?? 1} />
            </div>
          ) : (
            <Empty>No formation data yet.</Empty>
          )}
          <Unavailable title="Matchup edges" reason="Our tactical profiles cover national teams, not clubs, so club matchups are not scored yet." />
        </div>
      </div>

      <div className="home-block">
        <SectionHead id="model-performance" title="Model performance" note="Out-of-sample result first, then the in-sample check" />
        <div className="perf-grid">
          <div className="card">
            <h3>Out of sample: results-only model</h3>
            <p className="faint small">
              A Poisson attack and defence model, refitted before each matchday on earlier matchdays only. It is not one
              of the seven versions.
            </p>
            {oos ? (
              <>
                <OutOfSampleHeadline
                  model={oos.model.mean}
                  league={oos.league_average.mean}
                  diff={oos.model_minus_league_average.mean}
                  ci={[oos.model_minus_league_average.ci95[0], oos.model_minus_league_average.ci95[1]]}
                  matches={oos.matches}
                />
                <div className="table-wrap">
                  <table className="score-table">
                    <thead>
                      <tr>
                        <th className="team">Season</th>
                        <th>Matches</th>
                        <th>Model</th>
                        <th>League avg.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(oos.seasons).map(([season, v]) => (
                        <tr key={season}>
                          <td className="team">{season}</td>
                          <td className="mono">{v.matches}</td>
                          <td className="mono">{v.model_log_loss.toFixed(3)}</td>
                          <td className="mono">{v.league_average_log_loss.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <Empty>No walk-forward backtest file yet.</Empty>
            )}
          </div>
          <div className="card" id="scores">
            <h3>In sample: the seven versions</h3>
            {inSample ? (
              <>
                <p className="caveat small">{inSample.caveat}</p>
                <ModelScoreTable rows={inSample.rows} />
                <p className="faint small">
                  {inSample.matches} matches, {inSample.simulations_per_model} simulations per version.
                  {uniformRow ? ` A uniform 1/3 guess scores log loss ${uniformRow.log_loss?.toFixed(3)}.` : ""}
                </p>
              </>
            ) : (
              <Empty>No scoring file yet.</Empty>
            )}
          </div>
        </div>
      </div>

      <div className="home-block">
        <SectionHead id="methodology" title="Research and methodology" note="How each number is made and graded" />
        <div className="method-grid">
          <div className="tool">
            <h3>How a probability is made</h3>
            <p>
              Bookmaker odds become probabilities with the margin removed. Each model version then simulates the match
              many times, and the share of runs for each result is its probability.
            </p>
            <Link prefetch={false} className="section-link" href="/upcoming/">
              See the model versions <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="tool">
            <h3>How we grade</h3>
            <p>
              Accuracy, Brier score and log loss compare each probability with the real result. Lower Brier and log loss
              is better, and a uniform 1/3 guess is the baseline to beat.
            </p>
            <a className="section-link" href="#model-performance">
              See the scores <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="tool soon">
            <h3>Papers and documentation</h3>
            <p>Method notes and sources for each model version.</p>
            <span className="pill muted-pill">Coming soon</span>
          </div>
        </div>
      </div>

      <div className="home-block">
        <div className="section-head">
          <h2>Sharpest numbers</h2>
          <span className="muted small">Favourites, title race, results and fixtures</span>
        </div>
        <section className="card">
          <div className="tabs" role="tablist" aria-label="Sharpest numbers">
            {TABS.map((key) => (
              <button
                key={key}
                className="tab"
                role="tab"
                id={`tab-${key}`}
                aria-controls={`panel-${key}`}
                aria-selected={tab === key}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
              >
                {TAB_LABELS[key]}
              </button>
            ))}
          </div>
          <div className="tab-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "results" || tab === "fixtures" ? <div className="match-list">{panels[tab]}</div> : panels[tab]}
          </div>
          {tab === "results" ? (
            <p className="faint small note-foot">
              Past predictions are not stored match by match yet, so results are not graded one at a time.
            </p>
          ) : null}
        </section>
      </div>

      <div className="home-block">
        <div className="section-head">
          <h2>The toolkit</h2>
          <span className="muted small">Live tools link through; the rest are being built</span>
        </div>
        <div className="toolkit">
          {TOOLKIT.map((t) => (
            <Link prefetch={false} className="tool" href={t.href} key={t.title}>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
            </Link>
          ))}
          {PLANNED.map((t) => (
            <div className="tool soon" key={t.title}>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
              <span className="pill muted-pill">Coming soon</span>
            </div>
          ))}
        </div>
      </div>

      <p className="disclaimer">
        Probabilities and odds are for information only. They are not betting advice. Please gamble responsibly, and
        only if you are 18 or over.
      </p>
    </>
  );
}
