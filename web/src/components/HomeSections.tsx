// Presentational pieces for the homepage. Each takes data from /api/home (insights),
// so a section can be re-pointed at new data without touching the page layout.
import Link from "next/link";
import { fmtDate, fmtPct, pathSegment } from "@/lib/format";
import type { OutcomeKey, PlayerCard, PredictionRow, Standing } from "@/lib/types";
import { OutcomeBar, TeamLink } from "@/components/ui";

export function outcomeLabel(o: OutcomeKey, home: string, away: string): string {
  if (o === "home") return `${home} to win`;
  if (o === "away") return `${away} to win`;
  return "Draw";
}

export function SectionHead({ id, title, note, href, linkLabel }: {
  id?: string;
  title: string;
  note: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="section-head" id={id}>
      <h2>{title}</h2>
      <span className="muted small">{note}</span>
      {href ? (
        <Link prefetch={false} className="section-link" href={href}>
          {linkLabel ?? "Open"} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}

// Shown where the site has no data yet. Says so plainly rather than inventing a number.
export function Unavailable({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="tile unavailable">
      <span className="pill muted-pill">Data unavailable</span>
      <strong>{title}</strong>
      <span className="faint small">{reason}</span>
    </div>
  );
}

export function FormChips({ form }: { form: ("W" | "D" | "L")[] }) {
  if (!form.length) return <span className="faint small">–</span>;
  return (
    <span className="form-chips" aria-label={`Last ${form.length}: ${form.join(", ")}`}>
      {form.map((f, i) => (
        <span key={i} className={`form-chip ${f}`}>
          {f}
        </span>
      ))}
    </span>
  );
}

export function PickCard({ m }: { m: PredictionRow & { pick: OutcomeKey; confidence: number; agree: number } }) {
  const marketShare = m.market_pct ? m.market_pct[m.pick] : null;
  return (
    <Link prefetch={false} className="pick-card" href={`/match/${pathSegment(m.id)}/`}>
      <div className="pick-top">
        <span className="pill">{m.competition_name}</span>
        <span className="faint small">{fmtDate(m.date)}</span>
      </div>
      <div className="pick-teams">
        <span>{m.home}</span>
        <span className="vs">v</span>
        <span>{m.away}</span>
      </div>
      <div className="pick-call">
        <span className="pick-label">{outcomeLabel(m.pick, m.home, m.away)}</span>
        <span className="pick-pct mono">{fmtPct(m.confidence)}</span>
      </div>
      <OutcomeBar p={m.model_pct} />
      <div className="pick-foot small">
        <span className="muted">
          {m.agree} of {m.versions} versions agree
        </span>
        <span className="faint">{marketShare == null ? "No bookmaker price" : `Bookmaker ${fmtPct(marketShare)}`}</span>
      </div>
    </Link>
  );
}

export function ValueList({ rows }: { rows: (PredictionRow & { outcome: OutcomeKey; gap: number })[] }) {
  return (
    <div className="value-list">
      <div className="value-row value-head" aria-hidden="true">
        <span>Outcome</span>
        <span>Bookmaker</span>
        <span>Model</span>
        <span>Gap</span>
      </div>
      {rows.map((m) => (
        <Link prefetch={false} className="value-row" key={m.id} href={`/match/${pathSegment(m.id)}/`}>
          <span className="value-fixture">
            <strong>{outcomeLabel(m.outcome, m.home, m.away)}</strong>
            <span className="faint small">
              {m.home} v {m.away} · {fmtDate(m.date)}
            </span>
          </span>
          <span className="value-cell mono" data-label="Bookmaker">
            {m.market_pct ? fmtPct(m.market_pct[m.outcome]) : "–"}
          </span>
          <span className="value-cell mono" data-label="Model">
            {fmtPct(m.model_pct[m.outcome])}
          </span>
          <span className="value-cell value-gap mono" data-label="Gap">
            +{m.gap.toFixed(1)} pts
          </span>
        </Link>
      ))}
    </div>
  );
}

export function LeagueTable({ rows }: { rows: (Standing & { form: ("W" | "D" | "L")[] })[] }) {
  return (
    <div className="table-wrap">
      <table className="league-table">
        <thead>
          <tr>
            <th className="pos">#</th>
            <th className="team">Team</th>
            <th>P</th>
            <th className="hide-sm">GD</th>
            <th>Pts</th>
            <th className="hide-sm">Last 5</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team} className={r.position <= 4 ? "top-four" : ""}>
              <td className="pos mono">{r.position}</td>
              <td className="team">
                <TeamLink team={r.team} crestSize={22} />
              </td>
              <td className="mono">{r.played}</td>
              <td className="mono hide-sm">
                {r.gd > 0 ? "+" : ""}
                {r.gd}
              </td>
              <td className="points mono">{r.points}</td>
              <td className="hide-sm">
                <FormChips form={r.form} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RankCard({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="card rank-card">
      <h3>{title}</h3>
      <span className="faint small">{note}</span>
      <ol className="rank-list">{children}</ol>
    </div>
  );
}

export function RankItem({ rank, team, value }: { rank: number; team: string; value: string }) {
  return (
    <li className="rank-item">
      <span className="rank-no mono">{rank}</span>
      <span className="rank-team">
        <TeamLink team={team} crestSize={22} />
      </span>
      <span className="rank-val mono">{value}</span>
    </li>
  );
}

export function PlayerRanking({ title, rows, value }: {
  title: string;
  rows: PlayerCard[];
  value: (p: PlayerCard) => string;
}) {
  return (
    <div className="card rank-card">
      <h3>{title}</h3>
      <ol className="rank-list">
        {rows.map((p, i) => (
          <li className="rank-item" key={p.id}>
            <span className="rank-no mono">{i + 1}</span>
            <span className="rank-team player-name">
              <strong>{p.name}</strong>
              <span className="faint small">
                {p.team} · £{p.price.toFixed(1)}m
              </span>
            </span>
            <span className="rank-val mono">{value(p)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const STATUS_CLASS: Record<string, string> = { Injured: "bad", Suspended: "bad", Doubtful: "warn" };

export function AvailabilityList({ rows }: {
  rows: { name: string; team: string; status: string; news: string; selected_by_percent: number | null }[];
}) {
  if (!rows.length) return <p className="faint small">No injuries, doubts or suspensions flagged.</p>;
  return (
    <ul className="availability-list">
      {rows.map((p) => (
        <li key={`${p.name}-${p.team}`} className="availability-item">
          <div className="availability-head">
            <span>
              <strong>{p.name}</strong> <span className="faint small">{p.team}</span>
            </span>
            <span className={`status-pill ${STATUS_CLASS[p.status] ?? ""}`}>{p.status}</span>
          </div>
          {p.news ? <span className="faint small">{p.news}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function FormationBars({ rows, max }: { rows: { formation: string; clubs: number; teams: string[] }[]; max: number }) {
  return (
    <div className="formation-list">
      {rows.map((r) => (
        <div className="formation-row" key={r.formation}>
          <span className="formation-name mono">{r.formation}</span>
          <div className="bar-track" role="presentation">
            <div className="bar-fill" style={{ width: `${(r.clubs / Math.max(max, 1)) * 100}%` }} />
          </div>
          <span className="formation-count mono">{r.clubs}</span>
          <span className="faint small formation-teams">
            {r.teams.slice(0, 3).join(", ")}
            {r.teams.length > 3 ? ` +${r.teams.length - 3} more` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendTile({ label, pct, note }: { label: string; pct: number; note?: string }) {
  return (
    <div className="tile trend-tile">
      <span className="stat-label">{label}</span>
      <span className="trend-value mono">{fmtPct(pct)}</span>
      <div className="bar-track" role="presentation">
        <div className="bar-fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      {note ? <span className="faint small">{note}</span> : null}
    </div>
  );
}

const IN_SAMPLE_NAMES: Record<string, string> = {
  bookmaker_avg_odds: "Bookmaker (average odds)",
  uniform_reference: "Uniform 1/3 baseline",
};

export function ModelScoreTable({ rows }: {
  rows: { name: string; accuracy_pct: number | null; brier: number | null; log_loss: number | null; exact_score_hits: number | null }[];
}) {
  return (
    <div className="table-wrap">
      <table className="score-table">
        <thead>
          <tr>
            <th className="team">Model</th>
            <th>Acc.</th>
            <th>Brier</th>
            <th>Log loss</th>
            <th className="hide-sm">Exact</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className={r.name === "bookmaker_avg_odds" ? "benchmark" : ""}>
              <td className="team">{IN_SAMPLE_NAMES[r.name] ?? r.name}</td>
              <td className="mono">{r.accuracy_pct == null ? "–" : `${r.accuracy_pct.toFixed(0)}%`}</td>
              <td className="mono">{r.brier == null ? "–" : r.brier.toFixed(3)}</td>
              <td className="mono">{r.log_loss == null ? "–" : r.log_loss.toFixed(3)}</td>
              <td className="mono hide-sm">{r.exact_score_hits ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(3)}`;

export function OutOfSampleHeadline({ model, league, diff, ci, matches }: {
  model: number;
  league: number;
  diff: number;
  ci: [number, number];
  matches: number;
}) {
  return (
    <div className="oos">
      <div className="oos-number mono">{signed(diff)}</div>
      <p className="small">
        Log loss change against the league-average forecast, where lower is better: the model scored{" "}
        <strong className="mono">{model.toFixed(3)}</strong> and the league average <strong className="mono">{league.toFixed(3)}</strong>.
      </p>
      <p className="faint small">
        95% interval {ci[0].toFixed(3)} to {ci[1].toFixed(3)} across {matches.toLocaleString()} Premier League matches.{" "}
        {ci[1] < 0
          ? "The whole interval is below zero, so the model beat the league average over this sample."
          : "The interval includes zero, so the model did not clearly beat the league average over this sample."}
      </p>
    </div>
  );
}
