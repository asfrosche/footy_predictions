"use client";

import { useMemo, useState } from "react";
import { useApi } from "@/lib/api";
import type { FplPlayer, PlayersResponse } from "@/lib/types";
import { ErrorBox, Loading } from "@/components/ui";

type SortKey = "total_points" | "price" | "form" | "selected_by_percent" | "expected_goals" | "ep_next";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "total_points", label: "Points" },
  { key: "form", label: "Form" },
  { key: "ep_next", label: "Next GW (exp.)" },
  { key: "expected_goals", label: "xG" },
  { key: "selected_by_percent", label: "Owned %" },
  { key: "price", label: "Price" },
];

const POSITIONS = ["GKP", "DEF", "MID", "FWD"] as const;

export function PlayersView() {
  const { data, error } = useApi<PlayersResponse>("/players?limit=700", 300);
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const [position, setPosition] = useState("");
  const [sort, setSort] = useState<SortKey>("total_points");

  const teams = useMemo(
    () => Array.from(new Set((data?.players ?? []).map((p) => p.team))).sort(),
    [data],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.players ?? [])
      .filter((p) => !team || p.team === team)
      .filter((p) => !position || p.position === position)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.full_name.toLowerCase().includes(q))
      .sort((a, b) => b[sort] - a[sort])
      .slice(0, 100);
  }, [data, query, team, position, sort]);

  if (error) return <ErrorBox message={error.message} />;

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Fantasy Premier League</span>
        <h1>Player stats</h1>
        <p>Season stats from the official Fantasy Premier League API. Top 100 for the filters shown.</p>
      </header>

      <section className="card">
        <div className="card-head">
          <h2>Players</h2>
          <span className="muted small">{data ? `${rows.length} shown` : ""}</span>
        </div>
        <div className="run-bar" style={{ marginBottom: 12 }}>
          <input
            type="search"
            placeholder="Search player"
            aria-label="Search player"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select aria-label="Team" value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select aria-label="Position" value={position} onChange={(e) => setPosition(e.target.value)}>
            <option value="">All positions</option>
            {POSITIONS.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
          <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>Sort: {s.label}</option>
            ))}
          </select>
        </div>

        {!data ? (
          <Loading />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="team">Player</th>
                  <th>Pos</th>
                  <th>Price</th>
                  <th>Pts</th>
                  <th>Form</th>
                  <th>Next GW</th>
                  <th>G</th>
                  <th>A</th>
                  <th>xG</th>
                  <th>Owned</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((p: FplPlayer) => (
                    <tr key={p.id}>
                      <td className="team">
                        {p.name} <span className="faint small">{p.team}</span>
                        {p.status !== "a" && <span className="faint small"> · unavailable</span>}
                      </td>
                      <td className="mono">{p.position}</td>
                      <td className="mono">£{p.price.toFixed(1)}m</td>
                      <td className="mono">{p.total_points}</td>
                      <td className="mono">{p.form.toFixed(1)}</td>
                      <td className="mono">{p.ep_next.toFixed(1)}</td>
                      <td className="mono">{p.goals}</td>
                      <td className="mono">{p.assists}</td>
                      <td className="mono">{p.expected_goals.toFixed(1)}</td>
                      <td className="mono">{p.selected_by_percent.toFixed(1)}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="team faint">No players match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="faint small" style={{ marginTop: 12 }}>
          Source: Fantasy Premier League API. Unofficial endpoint, so it may change without notice.
        </p>
      </section>
    </>
  );
}
