"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE, useApi } from "@/lib/api";
import { fmtDate, fmtPct, pathSegment } from "@/lib/format";
import type { FixtureDetail, MatchSummary, ModelResult, TeamProfile, UpcomingResponse } from "@/lib/types";
import { Crest, Empty, ErrorBox, Loading, MatchRow, ModelCard, OutcomeBar, ProbRow } from "@/components/ui";

const MODEL_KEYS = ["v1", "v2", "v3", "v4", "v5", "v6"];

type RunSnapshot = {
  done: number;
  total: number;
  finished: boolean;
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
              <Link className="fixture" href={`/match/${pathSegment(f.id)}/`} key={f.id}>
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

export function MatchView({ id }: { id: string }) {
  const { data, error } = useApi<FixtureDetail>(`/premier-league/fixtures/${pathSegment(id)}`, 60);
  const [models, setModels] = useState<Record<string, ModelResult> | null>(null);
  const [source, setSource] = useState<string>("");
  const [sims, setSims] = useState("200");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

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

  const runModels = async () => {
    const total = Number(sims);
    setRunning(true);
    setRunError(null);
    setProgress({ done: 0, total });
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
    }
  };

  return (
    <>
      <header className="page-head">
        <Link className="back" href="/upcoming/">
          ← Upcoming fixtures
        </Link>
        <span className="eyebrow">
          {data.competition_name}
          {data.matchday ? ` · Gameweek ${data.matchday}` : ""}
        </span>
        <h1>
          {data.home} v {data.away}
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
        </section>
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h2>Six model versions</h2>
          <span className="muted small">{source}</span>
        </div>
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
          <div className="run-progress" aria-live="polite">
            <div className="bar-track" role="presentation">
              <div className="bar-fill" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <span className="small mono muted">
              {progress.done} / {progress.total}
            </span>
          </div>
        )}
        {runError && <ErrorBox message={runError} />}
        <div className="model-grid">
          {MODEL_KEYS.map((k) => (
            <ModelCard key={k} name={k} p={models?.[k]} />
          ))}
        </div>
      </section>
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
          <Link href="/matches/" className="pill">
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
