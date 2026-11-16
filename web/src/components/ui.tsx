import Link from "next/link";
import { crestSrc, initials } from "@/lib/crests";
import { fmtDate, fmtPct, pathSegment } from "@/lib/format";
import type { MatchSummary, ModelResult, Outcome, Standing } from "@/lib/types";

export function Crest({ team, large = false }: { team: string; large?: boolean }) {
  const src = crestSrc(team);
  if (!src) return null;
  return (
    <img className={large ? "crest crest-lg" : "crest"} src={src} alt="" width={large ? 56 : 20} height={large ? 56 : 20} />
  );
}

export function TeamLink({ team }: { team: string }) {
  return (
    <Link className="team-link" href={`/team/${pathSegment(team)}/`}>
      {team}
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
      <Link className="match match-link" href={`/match/${pathSegment(m.id)}/`}>
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

export function ModelCard({ name, p }: { name: string; p: ModelResult | undefined }) {
  if (!p) {
    return (
      <div className="model-card">
        <div className="model-head">
          <span className="model-name">{name}</span>
        </div>
        <p className="faint small">Not simulated yet.</p>
      </div>
    );
  }
  return (
    <div className="model-card">
      <div className="model-head">
        <span className="model-name">{name}</span>
        <span className="score mono">{p.likely_score}</span>
      </div>
      <OutcomeBar p={p} />
      <ProbRow p={p} />
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
