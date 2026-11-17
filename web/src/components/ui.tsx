import Link from "next/link";
import { crestSrc, initials } from "@/lib/crests";
import { fmtDate, fmtPct, pathSegment } from "@/lib/format";
import type { MatchSummary, ModelResult, Outcome, Standing } from "@/lib/types";

export function Crest({ team, large = false, size }: { team: string; large?: boolean; size?: number }) {
  const src = crestSrc(team);
  if (!src) return null;
  const px = size ?? (large ? 56 : 28);
  return <img className={large ? "crest crest-lg" : "crest"} src={src} alt="" width={px} height={px} style={{ width: px, height: px }} />;
}

export function TeamLink({ team, crestSize = 28 }: { team: string; crestSize?: number }) {
  return (
    <Link prefetch={false} className="team-link team-with-crest" href={`/team/${pathSegment(team)}/`}>
      <Crest team={team} size={crestSize} />
      <span>{team}</span>
    </Link>
  );
}

export function Loading() {
  return <p className="loading">Loading…</p>;
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="error" role="alert">
      {message}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function MatchRow({ m }: { m: MatchSummary }) {
  const done = m.status === "completed";
  const score = done ? `${m.home_score} – ${m.away_score}` : "vs";
  const stage = m.group ? `${m.stage} · ${m.group}` : m.stage;
  const body = (
    <>
      <div className="match-main">
        <div className="match-meta">
          <span>{fmtDate(m.date)}</span>
          {stage && <span>{stage}</span>}
          {m.matchday && <span>Matchday {m.matchday}</span>}
        </div>
        <div className="match-line" style={{ marginTop: 8 }}>
          <span className={`team-name home with-crest ${done && m.result === "home" ? "winner" : ""}`}>
            <Crest team={m.home} />
            <span>{m.home}</span>
          </span>
          <span className={`score mono ${done ? "" : "pending"}`}>{score}</span>
          <span className={`team-name away with-crest ${done && m.result === "away" ? "winner" : ""}`}>
            <Crest team={m.away} />
            <span>{m.away}</span>
          </span>
        </div>
      </div>
      <span className={`pill ${done ? "muted-pill" : ""}`}>{done ? "Full time" : "Scheduled"}</span>
    </>
  );

  // Premier League matches open their match page (the six model versions).
  // World Cup matches have no model runs, so they stay as plain rows.
  if (m.competition === "premier-league") {
    return (
      <Link prefetch={false} className="match match-link" href={`/match/${pathSegment(m.id)}/`}>
        {body}
      </Link>
    );
  }
  return <article className="match">{body}</article>;
}

export function OutcomeBar({ p }: { p: Outcome }) {
  return (
    <div className="outcome-bar" role="img" aria-label={`Home ${fmtPct(p.home)}, draw ${fmtPct(p.draw)}, away ${fmtPct(p.away)}`}>
      <span className="seg home" style={{ width: `${p.home}%` }} />
      <span className="seg draw" style={{ width: `${p.draw}%` }} />
      <span className="seg away" style={{ width: `${p.away}%` }} />
    </div>
  );
}

export function ProbRow({ p }: { p: Outcome }) {
  return (
    <div className="big-match-probs mono">
      <span>
        <b>{fmtPct(p.home)}</b> Home
      </span>
      <span>
        <b>{fmtPct(p.draw)}</b> Draw
      </span>
      <span>
        <b>{fmtPct(p.away)}</b> Away
      </span>
    </div>
  );
}

export const MODEL_BLURBS: Record<string, string> = {
  v1: "Elo ratings set each side's expected goals, with a capped upset factor.",
  v2: "Squad player ratings, weighted by position, set expected goals.",
  v3: "V2 strength adjusted for form, chemistry, momentum and experience.",
  v4: "V3 plus a tactical matchup adjustment.",
  v5: "Minute-by-minute match simulation, with goals drawn from V3's rates.",
  v6: "V5 with per-team attacking corrections from results so far.",
  vcopy1: "Small neural net on each team's last 10 matches, then a scoreline.",
};

// Worst-case 95% margin for one outcome share over n simulations, in percentage points.
export function marginOfError(n: number): number {
  return Math.round(100 * 1.96 * Math.sqrt(0.25 / n));
}

export function ModelCard({ name, p, sims }: { name: string; p: ModelResult | undefined; sims?: number | null }) {
  const blurb = MODEL_BLURBS[name];
  if (!p) {
    return (
      <div className="model-card">
        <div className="model-head">
          <span className="model-name">{name}</span>
        </div>
        {blurb && <p className="faint small" style={{ margin: "2px 0 6px" }}>{blurb}</p>}
        <p className="faint small">Not simulated yet.</p>
      </div>
    );
  }
  return (
    <div className="model-card">
      <div className="model-head">
        <span className="model-name">{name}</span>
      </div>
      {blurb && <p className="faint small" style={{ margin: "2px 0 6px" }}>{blurb}</p>}
      <OutcomeBar p={p} />
      <ProbRow p={p} />
      {sims ? (
        <p className="faint small" style={{ margin: "6px 0 0" }}>
          Each share can be about ±{marginOfError(sims)} points just from the number of runs ({sims} per version).
        </p>
      ) : null}
    </div>
  );
}

export function StandingsTable({ rows }: { rows: Standing[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="pos">#</th>
            <th className="team">Team</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF</th>
            <th>GA</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team} className={r.position <= 4 ? "top-four" : ""}>
              <td className="pos mono">{r.position}</td>
              <td className="team">
                <TeamLink team={r.team} />
              </td>
              <td className="mono">{r.played}</td>
              <td className="mono">{r.won}</td>
              <td className="mono">{r.drawn}</td>
              <td className="mono">{r.lost}</td>
              <td className="mono">{r.gf}</td>
              <td className="mono">{r.ga}</td>
              <td className="mono">
                {r.gd > 0 ? "+" : ""}
                {r.gd}
              </td>
              <td className="points mono">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Bars({ items, format = fmtPct }: { items: { team: string; probability: number }[]; format?: (n: number) => string }) {
  const max = Math.max(...items.map((i) => i.probability), 1);
  return (
    <div className="bars">
      {items.map((i) => (
        <div className="bar-row" key={i.team}>
          <span className="team-name">
            <TeamLink team={i.team} />
          </span>
          <div className="bar-track" role="presentation">
            <div className="bar-fill" style={{ width: `${((i.probability / max) * 100).toFixed(1)}%` }} />
          </div>
          <span className="bar-value">{format(i.probability)}</span>
        </div>
      ))}
    </div>
  );
}
