"use client";

import Link from "next/link";
import { useApi } from "@/lib/api";
import { fmtPct } from "@/lib/format";
import type { MatchOdds, Standing, TitleOdds, WorldCupGroup } from "@/lib/types";
import { Bars, ErrorBox, Loading, MatchRow, StandingsTable, TeamLink } from "@/components/ui";

export function PremierLeagueView() {
  const table = useApi<Standing[]>("/premier-league/standings", 300);
  const title = useApi<TitleOdds>("/premier-league/title-odds", 300);
  const odds = useApi<MatchOdds[]>("/premier-league/odds", 300);

  const error = table.error || title.error || odds.error;
  if (error) return <ErrorBox message={error.message} />;

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Premier League 2026/27</span>
        <h1>Table, title race &amp; odds</h1>
        <p>Standings are calculated from completed results. Positions one to four are highlighted.</p>
      </header>

      <section className="card">
        <div className="card-head">
          <h2>League table</h2>
          <span className="muted small">{table.data ? `${table.data.length} clubs` : ""}</span>
        </div>
        {table.data ? <StandingsTable rows={table.data} /> : <Loading />}
      </section>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <section className="card">
          <div className="card-head">
            <h2>Title odds</h2>
            <span className="muted small">Model approximation</span>
          </div>
          {title.data ? <Bars items={title.data.teams} /> : <Loading />}
          {title.data?.note && <p className="faint small" style={{ marginTop: 14 }}>{title.data.note}</p>}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Match odds</h2>
            <span className="muted small">Margin removed</span>
          </div>
          <p className="faint small" style={{ marginBottom: 10 }}>
            Decimal odds on the left, implied probability on the right. How the margin is removed:{" "}
            <Link prefetch={false} href="/research/#odds">Research, odds and margin</Link>
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="team">Fixture</th>
                  <th>H</th>
                  <th>D</th>
                  <th>A</th>
                  <th>H%</th>
                  <th>D%</th>
                  <th>A%</th>
                </tr>
              </thead>
              <tbody>
                {odds.data?.length ? (
                  odds.data.map((o) => (
                    <tr key={`${o.home}-${o.away}`}>
                      <td className="team">
                        <TeamLink team={o.home} /> <span className="faint small">v</span> <TeamLink team={o.away} />
                      </td>
                      <td className="mono">{o.decimal_odds.home.toFixed(2)}</td>
                      <td className="mono">{o.decimal_odds.draw.toFixed(2)}</td>
                      <td className="mono">{o.decimal_odds.away.toFixed(2)}</td>
                      <td className="mono">{fmtPct(o.implied_probability.home)}</td>
                      <td className="mono">{fmtPct(o.implied_probability.draw)}</td>
                      <td className="mono">{fmtPct(o.implied_probability.away)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="team faint">
                      {odds.data ? "No odds available." : "Loading…"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

export function WorldCupView() {
  const { data, error } = useApi<WorldCupGroup[]>("/world-cup/groups", 300);
  if (error) return <ErrorBox message={error.message} />;
  return (
    <>
      <header className="page-head">
        <span className="eyebrow">World Cup 2026</span>
        <h1>Group stage</h1>
        <p>Each group table is built from that group&apos;s fixtures only.</p>
      </header>
      {!data ? (
        <Loading />
      ) : (
        <div className="group-grid">
          {data.map((g) => (
            <section className="card" key={g.group}>
              <div className="card-head">
                <h2>{g.group}</h2>
                <span className="muted small">{g.fixtures.length} fixtures</span>
              </div>
              <StandingsTable rows={g.table} />
              <div className="match-list" style={{ marginTop: 14 }}>
                {g.fixtures.map((m) => (
                  <MatchRow key={m.id} m={m} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
