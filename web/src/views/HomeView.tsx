"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/api";
import { fmtDate, fmtPct, pathSegment } from "@/lib/format";
import type { HomeSummary, MatchSummary } from "@/lib/types";
import { Bars, Crest, Empty, ErrorBox, Loading, MatchRow, OutcomeBar, ProbRow, TeamLink } from "@/components/ui";

const TABS = ["favourites", "title", "results", "fixtures"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { favourites: "Favourites", title: "Title race", results: "Results", fixtures: "Fixtures" };

const TOOLKIT = [
  { title: "Fixtures", text: "Every match, filterable by competition, status and team.", href: "/matches/" },
  { title: "Premier League", text: "League table, title race and match odds with the margin removed.", href: "/premier-league/" },
  { title: "Upcoming", text: "Upcoming fixtures by gameweek, with the six model versions.", href: "/upcoming/" },
  { title: "World Cup", text: "Group tables built from each group's own fixtures.", href: "/world-cup/" },
];
const PLANNED = [
  { title: "AI predictions", text: "Win, draw and away chances for every match." },
  { title: "Value bets", text: "Where the model rates a price better than the bookmaker." },
  { title: "Live scores", text: "In-play scores and live stats." },
  { title: "Trends", text: "Streaks for home wins, BTTS and over 2.5 goals." },
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
          <h1>Match probabilities, <span className="text-gradient">straight from the prices.</span></h1>
          <p>
            Fixtures, results, tables and bookmaker odds for the Premier League and World Cup. Probabilities are worked
            out from the odds with the margin removed.
          </p>
          <div className="hero-actions">
            <Link prefetch={false} className="btn primary" href="/premier-league/">
              Premier League
            </Link>
            <Link prefetch={false} className="btn" href="/matches/">
              All fixtures
            </Link>
          </div>
        </div>
        {s.featured[0] ? <Spotlight m={s.featured[0]} /> : null}
      </section>

      <div className="stats">
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
          <div className="stat-label">Leagues</div>
          <div className="stat-value mono">{s.leagues}</div>
          <div className="stat-sub">Premier League and World Cup</div>
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
      </section>

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

      <p className="disclaimer">
        Probabilities and odds are for information only. They are not betting advice. Please gamble responsibly, and
        only if you are 18 or over.
      </p>
    </>
  );
}
