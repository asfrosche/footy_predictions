"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE, useApi } from "@/lib/api";
import { fmtDate, fmtPct, pathSegment } from "@/lib/format";
import type { FixtureDetail, KeyPlayer, LineupSide, MatchSummary, ModelResult, TeamProfile, UpcomingResponse } from "@/lib/types";
import { Crest, Empty, ErrorBox, Loading, MatchRow, ModelCard, OutcomeBar, ProbRow } from "@/components/ui";

const MODEL_KEYS = ["v1", "v2", "v3", "v4", "v5", "v6", "vcopy1"];

type RunSnapshot = {
  done: number;
  total: number;
  finished: boolean;
  status?: string;
  models?: Record<string, ModelResult>;
  error?: string;
};

export function UpcomingView() {
  const { data, error } = useApi<UpcomingResponse>("/premier-league/upcoming", 60);
  if (error) return <ErrorBox message={error.message} />;
  if (!data) return <Loading />;

  const run = data.model_run;
  const runNote =
    run.fixtures_simulated === run.fixtures_total
      ? `All ${run.fixtures_total} fixtures simulated, ${run.simulations_per_model} runs per version`
      : `${run.fixtures_simulated} of ${run.fixtures_total} fixtures simulated so far`;

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Premier League 2026/27</span>
        <h1>Upcoming fixtures</h1>
        <p>{runNote}. Open a fixture to see what each model version predicts.</p>
      </header>
      {data.gameweeks.length === 0 && <Empty>No upcoming fixtures.</Empty>}
      {data.gameweeks.map((g) => (
        <section className="card gameweek" key={String(g.gameweek)}>
          <div className="card-head">
            <h2>{g.gameweek == null ? "Other fixtures" : `Gameweek ${g.gameweek}`}</h2>
            <span className="muted small">From {fmtDate(g.start)}</span>
          </div>
          <div className="fixture-list">
            {g.fixtures.map((f) => (
              <Link prefetch={false} className="fixture" href={`/match/${pathSegment(f.id)}/`} key={f.id}>
                <span className="fixture-date faint small">{fmtDate(f.date)}</span>
                <span className="fixture-teams">
                  <span className="team-name home with-crest">
                    <Crest team={f.home} />
                    <span>{f.home}</span>
                  </span>
                  <span className="vs">vs</span>
                  <span className="team-name away with-crest">
                    <Crest team={f.away} />
                    <span>{f.away}</span>
                  </span>
                </span>
                <span className="fixture-tag small">{f.models ? "Six versions" : "Simulation pending"}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

// Short display name: the first two names only, e.g. "António João Pereira ... Silva" -> "António João".
function shortName(full: string): string {
  return full.trim().split(/\s+/).slice(0, 2).join(" ");
}

type PitchLine = "FWD" | "MID" | "DEF" | "GK";
const PITCH_LINES: { line: PitchLine; label: string }[] = [
  { line: "FWD", label: "Forwards" },
  { line: "MID", label: "Midfield" },
  { line: "DEF", label: "Defence" },
  { line: "GK", label: "Keeper" },
];

// Both teams' predicted XIs on shared rows: forwards at the top, keeper at the bottom.
// Each row is its own grid line, with home on the left and away on the right, so every
// player stays inside their own half of their row.
function LineupPitch({ home, away }: { home: LineupSide; away: LineupSide }) {
  const playersIn = (side: LineupSide, line: PitchLine): string[] => {
    const names = side.predicted_xi ?? [];
    const lines = side.predicted_xi_lines ?? names.map(() => "MID");
    return names.filter((_, i) => lines[i] === line);
  };
  return (
    <div className="xi">
      <div className="xi-line xi-heads">
        <span className="xi-team">
          <Crest team={home.team} />
          <span>{home.team}</span>
        </span>
        <span />
        <span className="xi-team">
          <Crest team={away.team} />
          <span>{away.team}</span>
        </span>
      </div>
      {PITCH_LINES.map(({ line, label }) => (
        <div className="xi-line" key={line} data-line={line}>
          <div className="xi-half">
            {playersIn(home, line).map((p) => (
              <span className="xi-player" key={p} title={p}>{shortName(p)}</span>
            ))}
          </div>
          <span className="xi-label">{label}</span>
          <div className="xi-half">
            {playersIn(away, line).map((p) => (
              <span className="xi-player" key={p} title={p}>{shortName(p)}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KeyPlayerList({ team, players }: { team: string; players: KeyPlayer[] }) {
  return (
    <div>
      <h3 style={{ margin: "0 0 8px", fontSize: "1rem" }}>{team}</h3>
      {players.length === 0 ? (
        <p className="faint small">No Fantasy data for this club.</p>
      ) : (
        <ul className="plain-list">
          {players.map((p) => (
            <li key={p.id} className="small">
              <strong>{p.name}</strong> <span className="faint">{p.position}</span>{" "}
              <span className="mono">{p.total_points} pts</span>{" "}
              <span className="faint">· form {p.form.toFixed(1)} · {p.goals}G {p.assists}A · £{p.price.toFixed(1)}m</span>
              {p.status !== "a" && <span className="faint"> · unavailable</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LineupCard({ side }: { side: LineupSide }) {
  return (
    <div>
      <h3 style={{ margin: "0 0 4px", fontSize: "1rem" }}>{side.team}</h3>
      <p className="small" style={{ margin: "0 0 4px" }}>
        Manager: <span style={{ fontWeight: 600 }}>{side.manager ?? "not available"}</span>
      </p>
      <p className="muted small" style={{ margin: "0 0 8px" }}>
        League position: <span className="mono">{side.position ?? "–"}</span>
        {" · "}Points: <span className="mono">{side.points ?? "–"}</span>
        {" · "}Formation: <span className="mono">{side.formation ?? "not available"}</span>
      </p>
      <p className="small" style={{ margin: "0 0 8px" }}>
        Form (last {side.previous.length}, oldest → newest):{" "}
        <span className="mono" style={{ fontWeight: 600 }}>{side.form.split("").join(" ") || "–"}</span>
      </p>
      {!(side.predicted_xi && side.predicted_xi.length) && <Empty>No predicted XI for this team.</Empty>}
      {side.xi_source && <p className="faint small" style={{ marginTop: 8 }}>{side.xi_source}</p>}
      {!side.for_this_match && (
        <p className="faint small" style={{ marginTop: 4 }}>
          This is the prediction for {side.team}&apos;s next match, not this fixture.
        </p>
      )}
      {side.confidence != null && (
        <p className="small" style={{ marginTop: 4 }}>
          Confidence <span className="mono" style={{ fontWeight: 600 }}>{Math.round(side.confidence * 100)}%</span>
        </p>
      )}
      {side.notes && side.notes.length > 0 && (
        <ul className="plain-list small faint" style={{ marginTop: 6 }}>
          {side.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
      <h4 style={{ margin: "14px 0 6px", fontSize: ".9rem" }}>Last 5 matches</h4>
      {side.previous.length ? (
        <ul className="form-list">
          {side.previous.map((m) => (
            <li className="form-row" key={m.id}>
              <span className={`form-res form-res-${m.result}`}>{m.result}</span>
              <span className="form-score mono">{m.score}</span>
              <span className="form-venue">{m.venue === "home" ? "H" : "A"}</span>
              <Crest team={m.opponent} />
              <span className="form-opp">
                {m.opponent}
                {m.opponent_position != null && <span className="faint"> #{m.opponent_position}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No previous matches on record.</Empty>
      )}
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>{title}</h2>
      </div>
      <p className="muted small" style={{ margin: 0 }}>{body}</p>
    </section>
  );
}

export function MatchView({ id }: { id: string }) {
  const { data, error } = useApi<FixtureDetail>(`/premier-league/fixtures/${pathSegment(id)}`, 60);
  const [models, setModels] = useState<Record<string, ModelResult> | null>(null);
  const [source, setSource] = useState<string>("");
  const [sims, setSims] = useState("200");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [runStatus, setRunStatus] = useState("");
  const [elapsed, setElapsed] = useState(0);

  // Elapsed time while a run is going, so a slow start is visibly still working.
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(timer);
  }, [running]);

  // Show the stored run as soon as it loads; a live run replaces it.
  useEffect(() => {
    if (!data) return;
    setModels(data.models);
    setSource(
      data.models_source
        ? `${data.models_source.type === "live" ? "Live run" : "Stored run"}, ${data.models_source.simulations_per_model} simulations per version`
        : "Not simulated yet",
    );
  }, [data]);

  if (error) return <ErrorBox message={error.message} />;
  if (!data) return <Loading />;

  // Runs behind the figures on screen: the live count while running, otherwise the stored count.
  const shownSims = running ? progress?.done || null : data.models_source?.simulations_per_model ?? null;

  const runModels = async () => {
    const total = Number(sims);
    setRunning(true);
    setRunError(null);
    setProgress({ done: 0, total });
    setRunStatus("Connecting to the model server…");
    setSource(`Running… 0 of ${total} simulations per version`);
    try {
      const res = await fetch(`${API_BASE}/api/premier-league/fixtures/${pathSegment(id)}/run-stream?sims=${total}`);
      if (!res.ok || !res.body) throw new Error("The models could not be run.");
      // The server sends one JSON line per update. Each line replaces the figures on screen.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) {
            const snap = JSON.parse(line) as RunSnapshot;
            if (snap.error) throw new Error(snap.error);
            if (snap.models) setModels(snap.models);
            if (snap.status) setRunStatus(snap.status);
            setProgress({ done: snap.done, total: snap.total });
            setSource(
              snap.finished
                ? `Live run, ${snap.total} simulations per version`
                : `Running… ${snap.done} of ${snap.total} simulations per version`,
            );
          }
          newline = buffer.indexOf("\n");
        }
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "The models could not be run.");
    } finally {
      setRunning(false);
      setProgress(null);
      setRunStatus("");
    }
  };

  return (
    <>
      <header className="page-head">
        <Link prefetch={false} className="back" href="/upcoming/">
          ← Upcoming fixtures
        </Link>
        <span className="eyebrow">
          {data.competition_name}
          {data.matchday ? ` · Gameweek ${data.matchday}` : ""}
        </span>
        <h1 className="fixture-title">
          <span className="fixture-team">
            <Crest team={data.home} large />
            <span>{data.home}</span>
          </span>
          <span className="fixture-v">v</span>
          <span className="fixture-team">
            <Crest team={data.away} large />
            <span>{data.away}</span>
          </span>
        </h1>
        <p>{fmtDate(data.date)}</p>
      </header>

      {data.market && data.market_prices && (
        <section className="card market-card">
          <div className="card-head">
            <h2>Market odds</h2>
            <span className="muted small">Margin removed</span>
          </div>
          <OutcomeBar p={data.market} />
          <ProbRow p={data.market} />
          <p className="faint small mono" style={{ marginTop: 10 }}>
            Decimal {data.market_prices.home} / {data.market_prices.draw} / {data.market_prices.away}
          </p>
          <p className="faint small" style={{ marginTop: 6 }}>
            How the margin is removed: <Link prefetch={false} href="/research/#odds">Research, odds and margin</Link>
          </p>
        </section>
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h2>Six model versions</h2>
          <span className="muted small">{source}</span>
        </div>
        <p className="faint small" style={{ margin: "0 0 12px" }}>
          How these versions are evaluated and where they come from:{" "}
          <Link prefetch={false} href="/research/#evaluation">Research</Link>
        </p>
        <div className="run-bar">
          <label className="small muted" htmlFor="sims">
            Simulations per version
          </label>
          <select id="sims" value={sims} onChange={(e) => setSims(e.target.value)}>
            <option value="200">200</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
          </select>
          <button className="btn primary" type="button" onClick={runModels} disabled={running}>
            {running ? "Running…" : "Run models"}
          </button>
        </div>
        {running && progress && (
          <div className="run-status" aria-live="polite">
            <div className="run-progress">
              <div className="bar-track" role="presentation">
                <div
                  className={progress.done ? "bar-fill" : "bar-fill bar-wait"}
                  style={progress.done ? { width: `${(progress.done / progress.total) * 100}%` } : undefined}
                />
              </div>
              <span className="small mono muted">
                {progress.done} / {progress.total} · {elapsed}s
              </span>
            </div>
            <p className="small muted" style={{ margin: "0 0 14px" }}>
              {runStatus || "Starting…"}
            </p>
          </div>
        )}
        {runError && <ErrorBox message={runError} />}
        <div className="model-grid">
          {MODEL_KEYS.map((k) => (
            <ModelCard key={k} name={k} p={models?.[k]} sims={shownSims} />
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h2>Predicted lineups</h2>
          <span className="muted small">Model XI from squad data, not a team sheet</span>
        </div>
        <LineupPitch home={data.lineups.home} away={data.lineups.away} />
        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <LineupCard side={data.lineups.home} />
          <LineupCard side={data.lineups.away} />
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h2>Key players</h2>
          <span className="muted small">Top Fantasy points this season</span>
        </div>
        <div className="grid grid-2">
          <KeyPlayerList team={data.home} players={data.key_players?.home ?? []} />
          <KeyPlayerList team={data.away} players={data.key_players?.away ?? []} />
        </div>
      </section>

      <div style={{ marginTop: 16 }}>
        <InfoCard title="Injuries and availability" body={data.injuries.note} />
      </div>

    </>
  );
}

export function TeamView({ name }: { name: string }) {
  const { data, error } = useApi<TeamProfile>(`/teams/${pathSegment(name)}`, 300);
  if (error) return <ErrorBox message={error.message} />;
  if (!data) return <Loading />;

  const club = data.club;
  const facts: [string, string][] = [];
  if (club) {
    facts.push(["Competition", "Premier League"]);
    facts.push(["Elo", club.elo != null ? String(club.elo) : "–"]);
    facts.push(["League position", club.standing ? String(club.standing.position) : "–"]);
    facts.push(["Points", club.standing ? String(club.standing.points) : "–"]);
    facts.push(["Title odds", fmtPct(club.title_probability)]);
  }
  if (data.national) {
    facts.push(["Strength modifier", data.national.strength_modifier != null ? String(data.national.strength_modifier) : "–"]);
  }

  return (
    <>
      <header className="page-head">
        <div className="card team-hero">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Crest team={data.name} large />
            <div>
              <span className="eyebrow" style={{ marginBottom: 4 }}>
                {club ? "Club" : "National team"}
              </span>
              <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>{data.name}</h1>
            </div>
          </div>
          <Link prefetch={false} href="/matches/" className="pill">
            All matches
          </Link>
        </div>
      </header>
      <div className="grid grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Profile</h2>
          </div>
          {facts.length ? (
            <dl className="kv">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd className="mono">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <Empty>No profile data for this team.</Empty>
          )}
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Fixtures</h2>
            <span className="muted small">{data.fixtures.length} total</span>
          </div>
          <div className="match-list">
            {data.fixtures.length ? (
              data.fixtures.map((m: MatchSummary) => <MatchRow key={m.id} m={m} />)
            ) : (
              <Empty>No fixtures on record.</Empty>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
