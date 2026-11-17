"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api";
import type { MatchSummary } from "@/lib/types";
import { Empty, ErrorBox, Loading, MatchRow } from "@/components/ui";

// Upcoming matches, soonest first. Past matches, most recent first.
function splitByDate(list: MatchSummary[]): { upcoming: MatchSummary[]; past: MatchSummary[] } {
  const now = new Date().toISOString();
  const upcoming = list
    .filter((m) => (m.date ?? "") >= now)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const past = list
    .filter((m) => (m.date ?? "") < now)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return { upcoming, past };
}

export function MatchesView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const competition = params.get("competition") ?? "";
  const status = params.get("status") ?? "";
  const team = params.get("team") ?? "";

  const [teamText, setTeamText] = useState(team);
  const [open, setOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const qs = new URLSearchParams();
  if (competition) qs.set("competition", competition);
  if (status) qs.set("status", status);
  if (team) qs.set("team", team);
  const query = qs.toString();

  const { data, error } = useApi<MatchSummary[]>(`/matches${query ? `?${query}` : ""}`, 60);
  const { data: everything } = useApi<MatchSummary[]>("/matches", 300);

  // Every team name in the data, for the dropdown.
  const teamNames = useMemo(() => {
    const names = new Set<string>();
    everything?.forEach((m) => {
      names.add(m.home);
      names.add(m.away);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [everything]);

  // Narrows as you type. Matches any part of the name, not just the start.
  const suggestions = useMemo(() => {
    const needle = teamText.trim().toLowerCase();
    return teamNames.filter((t) => !needle || t.toLowerCase().includes(needle)).slice(0, 50);
  }, [teamNames, teamText]);

  const update = (next: Record<string, string>) => {
    const q = new URLSearchParams({ competition, status, team, ...next });
    for (const [k, v] of [...q.entries()]) if (!v) q.delete(k);
    router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };

  const choose = (name: string) => {
    setTeamText(name);
    setOpen(false);
    update({ team: name });
  };

  const split = data ? splitByDate(data) : null;
  // Past results are hidden by default, unless the status filter asks for completed matches.
  const pastVisible = showPast || status === "completed";
  const shownCount = split ? split.upcoming.length + (pastVisible ? split.past.length : 0) : 0;

  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Fixtures &amp; results</span>
        <h1>Matches</h1>
        <p>{split ? `${shownCount} match${shownCount === 1 ? "" : "es"} shown.` : "Loading…"}</p>
      </header>

      <div className="filters">
        <div className="field">
          <label htmlFor="f-competition">Competition</label>
          <select id="f-competition" value={competition} onChange={(e) => update({ competition: e.target.value })}>
            <option value="">All competitions</option>
            <option value="world-cup">World Cup</option>
            <option value="premier-league">Premier League</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
        <div className="field combo">
          <label htmlFor="f-team">Team</label>
          <input
            id="f-team"
            type="text"
            role="combobox"
            autoComplete="off"
            aria-expanded={open && suggestions.length > 0}
            aria-controls="f-team-list"
            placeholder="Type to filter, e.g. ars"
            value={teamText}
            onChange={(e) => {
              setTeamText(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setOpen(false);
              // Keep the typed text only if it is exactly one team; otherwise reset to the active filter.
              const exact = teamNames.find((t) => t.toLowerCase() === teamText.trim().toLowerCase());
              if (exact) update({ team: exact });
              else setTeamText(team);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length > 0) {
                e.preventDefault();
                choose(suggestions[0]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          {team && (
            <button
              type="button"
              className="combo-clear"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setTeamText("");
                update({ team: "" });
              }}
              aria-label="Clear team filter"
            >
              ×
            </button>
          )}
          {open && suggestions.length > 0 && (
            <ul id="f-team-list" className="combo-list" role="listbox">
              {suggestions.map((name) => (
                <li
                  key={name}
                  role="option"
                  aria-selected={name === team}
                  className={name === team ? "active" : ""}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(name);
                  }}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {error ? (
        <ErrorBox message={error.message} />
      ) : !split ? (
        <Loading />
      ) : split.upcoming.length || split.past.length ? (
        <>
          {status !== "completed" && (
            <>
              <h2 className="list-head">Upcoming</h2>
              {split.upcoming.length ? (
                <div className="match-list">
                  {split.upcoming.map((m) => (
                    <MatchRow key={m.id} m={m} />
                  ))}
                </div>
              ) : (
                <Empty>No upcoming matches for these filters.</Empty>
              )}
            </>
          )}

          {status !== "scheduled" && split.past.length > 0 && (
            <div className="past-section">
              {status !== "completed" && (
                <button
                  type="button"
                  className="past-toggle"
                  aria-expanded={showPast}
                  onClick={() => setShowPast((v) => !v)}
                >
                  {showPast ? "Hide past matches" : `Show past matches (${split.past.length})`}
                  <span aria-hidden="true">{showPast ? " ▴" : " ▾"}</span>
                </button>
              )}
              {pastVisible && (
                <>
                  <h2 className="list-head">Past results</h2>
                  <div className="match-list">
                    {split.past.map((m) => (
                      <MatchRow key={m.id} m={m} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <Empty>No matches for these filters.</Empty>
      )}
    </>
  );
}
