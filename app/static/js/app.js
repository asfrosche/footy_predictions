/* Footy Predictions front end. No framework, no build step.
   Every value from the API goes through esc() before it reaches the DOM. */

(() => {
  "use strict";

  const app = document.getElementById("app");
  const COMPETITION_NAMES = { "world-cup": "World Cup", "premier-league": "Premier League" };

  // ---------- helpers ----------

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);

  const teamLink = (name) =>
    `<a class="team-link" href="#/team/${encodeURIComponent(name)}">${esc(name)}</a>`;

  const fmtDate = (iso) => {
    if (!iso) return "TBC";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "TBC"
      : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  };

  const fmtPct = (n) => (n == null ? "–" : `${Number(n).toFixed(1)}%`);

  async function getJSON(path) {
    const res = await fetch(`/api${path}`, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      const err = new Error(res.status === 404 ? "Not found." : "Could not load data.");
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  const errorBox = (message) => `<div class="error" role="alert">${esc(message)}</div>`;
  const emptyBox = (message) => `<p class="empty">${esc(message)}</p>`;

  function matchRow(m) {
    const done = m.status === "completed";
    const homeWon = done && m.result === "home";
    const awayWon = done && m.result === "away";
    const score = done ? `${m.home_score} – ${m.away_score}` : "vs";
    const stage = m.group ? `${m.stage} · ${m.group}` : m.stage;
    return `
      <article class="match">
        <div class="match-main">
          <div class="match-meta">
            <span>${esc(fmtDate(m.date))}</span>
            ${stage ? `<span>${esc(stage)}</span>` : ""}
            ${m.matchday ? `<span>Matchday ${esc(m.matchday)}</span>` : ""}
          </div>
          <div class="match-line" style="margin-top:8px">
            <span class="team-name home ${homeWon ? "winner" : ""}">${esc(m.home)}</span>
            <span class="score ${done ? "" : "pending"} mono">${esc(score)}</span>
            <span class="team-name away ${awayWon ? "winner" : ""}">${esc(m.away)}</span>
          </div>
        </div>
        <span class="pill ${done ? "muted-pill" : ""}">${done ? "Full time" : "Scheduled"}</span>
      </article>`;
  }

  function standingsTable(rows) {
    const body = rows.map((r) => {
      const top = r.position <= 4 ? "top-four" : "";
      return `
        <tr class="${top}">
          <td class="pos mono">${r.position}</td>
          <td class="team">${teamLink(r.team)}</td>
          <td class="mono">${r.played}</td>
          <td class="mono">${r.won}</td>
          <td class="mono">${r.drawn}</td>
          <td class="mono">${r.lost}</td>
          <td class="mono">${r.gf}</td>
          <td class="mono">${r.ga}</td>
          <td class="mono">${r.gd > 0 ? "+" : ""}${r.gd}</td>
          <td class="points mono">${r.points}</td>
        </tr>`;
    }).join("");
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="pos">#</th><th class="team">Team</th><th>P</th><th>W</th><th>D</th>
              <th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }

  function bars(items, labelKey, valueKey, format) {
    const max = Math.max(...items.map((i) => i[valueKey]), 1);
    return `<div class="bars">${items.map((i) => `
      <div class="bar-row">
        <span class="team-name">${teamLink(i[labelKey])}</span>
        <div class="bar-track" role="presentation">
          <div class="bar-fill" style="width:${((i[valueKey] / max) * 100).toFixed(1)}%"></div>
        </div>
        <span class="bar-value">${esc(format(i[valueKey]))}</span>
      </div>`).join("")}</div>`;
  }

  // ---------- pages ----------

  async function overview() {
    const s = await getJSON("/summary");
    const leader = s.league_leader;
    const favourite = s.title_favourites[0];
    return `
      <section class="hero">
        <span class="eyebrow">Football analytics</span>
        <h1>Fixtures, results and market odds in one place.</h1>
        <p>Live standings for the Premier League, World Cup group tables, and the bookmaker
           odds behind each price. Built on FastAPI, served as a single static site.</p>
      </section>

      <div class="stats">
        <div class="stat">
          <div class="stat-label">Completed matches</div>
          <div class="stat-value mono">${s.completed_count}</div>
          <div class="stat-sub">Across both competitions</div>
        </div>
        <div class="stat">
          <div class="stat-label">Scheduled</div>
          <div class="stat-value mono">${s.scheduled_count}</div>
          <div class="stat-sub">Upcoming fixtures</div>
        </div>
        <div class="stat">
          <div class="stat-label">Premier League leader</div>
          <div class="stat-value" style="font-size:1.15rem">${leader ? teamLink(leader.team) : "–"}</div>
          <div class="stat-sub">${leader ? `${leader.points} pts after ${leader.played} played` : ""}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Title favourite</div>
          <div class="stat-value" style="font-size:1.15rem">${favourite ? teamLink(favourite.team) : "–"}</div>
          <div class="stat-sub">${favourite ? fmtPct(favourite.probability) : ""}</div>
        </div>
      </div>

      <div class="grid grid-2">
        <section class="card">
          <div class="card-head"><h2>Latest results</h2><span class="muted small">Most recent first</span></div>
          <div class="match-list">${s.latest_results.map(matchRow).join("") || emptyBox("No results yet.")}</div>
        </section>
        <section class="card">
          <div class="card-head"><h2>Next fixtures</h2><span class="muted small">In date order</span></div>
          <div class="match-list">${s.next_fixtures.map(matchRow).join("") || emptyBox("No fixtures scheduled.")}</div>
        </section>
      </div>

      <section class="card" style="margin-top:16px">
        <div class="card-head"><h2>Title odds</h2><span class="muted small">Top five · model approximation</span></div>
        ${bars(s.title_favourites, "team", "probability", fmtPct)}
      </section>`;
  }

  async function matches(query) {
    const params = new URLSearchParams();
    if (query.competition) params.set("competition", query.competition);
    if (query.status) params.set("status", query.status);
    if (query.team) params.set("team", query.team);
    const list = await getJSON(`/matches?${params}`);
    const options = (values, current, labels = {}) =>
      values.map(([v, l]) => `<option value="${esc(v)}" ${v === current ? "selected" : ""}>${esc(l)}</option>`).join("");

    return `
      <header class="page-head">
        <span class="eyebrow">Fixtures & results</span>
        <h1>Matches</h1>
        <p id="match-count">${list.length} match${list.length === 1 ? "" : "es"} match your filters.</p>
      </header>
      <form class="filters" id="match-filters" role="search">
        <div class="field">
          <label for="f-competition">Competition</label>
          <select id="f-competition" name="competition">
            ${options([["", "All competitions"], ["world-cup", "World Cup"], ["premier-league", "Premier League"]], query.competition || "")}
          </select>
        </div>
        <div class="field">
          <label for="f-status">Status</label>
          <select id="f-status" name="status">
            ${options([["", "All"], ["completed", "Completed"], ["scheduled", "Scheduled"]], query.status || "")}
          </select>
        </div>
        <div class="field">
          <label for="f-team">Team</label>
          <input type="search" id="f-team" name="team" placeholder="e.g. Arsenal" value="${esc(query.team || "")}" maxlength="80">
        </div>
      </form>
      <div class="match-list" id="match-list">${list.map(matchRow).join("") || emptyBox("No matches for these filters.")}</div>`;
  }

  async function premierLeague() {
    const [table, title, odds] = await Promise.all([
      getJSON("/premier-league/standings"),
      getJSON("/premier-league/title-odds"),
      getJSON("/premier-league/odds"),
    ]);
    const oddsRows = odds.map((o) => `
      <tr>
        <td class="team">${teamLink(o.home)} <span class="faint small">v</span> ${teamLink(o.away)}</td>
        <td class="mono">${o.decimal_odds.home.toFixed(2)}</td>
        <td class="mono">${o.decimal_odds.draw.toFixed(2)}</td>
        <td class="mono">${o.decimal_odds.away.toFixed(2)}</td>
        <td class="mono">${fmtPct(o.implied_probability.home)}</td>
        <td class="mono">${fmtPct(o.implied_probability.draw)}</td>
        <td class="mono">${fmtPct(o.implied_probability.away)}</td>
      </tr>`).join("");

    return `
      <header class="page-head">
        <span class="eyebrow">Premier League 2026/27</span>
        <h1>Table, title race & odds</h1>
        <p>Standings are calculated from completed results. Positions one to four are highlighted.</p>
      </header>
      <section class="card">
        <div class="card-head"><h2>League table</h2><span class="muted small">${table.length} clubs</span></div>
        ${standingsTable(table)}
      </section>
      <div class="grid grid-2" style="margin-top:16px">
        <section class="card">
          <div class="card-head"><h2>Title odds</h2><span class="muted small">Model approximation</span></div>
          ${bars(title.teams, "team", "probability", fmtPct)}
          <p class="faint small" style="margin-top:14px">${esc(title.note || "")}</p>
        </section>
        <section class="card">
          <div class="card-head"><h2>Match odds</h2><span class="muted small">Margin removed</span></div>
          <p class="faint small" style="margin-bottom:10px">Decimal odds on the left, implied probability on the right.</p>
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th class="team">Fixture</th><th>H</th><th>D</th><th>A</th><th>H%</th><th>D%</th><th>A%</th>
              </tr></thead>
              <tbody>${oddsRows || `<tr><td colspan="7" class="team faint">No odds available.</td></tr>`}</tbody>
            </table>
          </div>
        </section>
      </div>`;
  }

  async function worldCup() {
    const groups = await getJSON("/world-cup/groups");
    const cards = groups.map((g) => `
      <section class="card">
        <div class="card-head"><h2>${esc(g.group)}</h2><span class="muted small">${g.fixtures.length} fixtures</span></div>
        ${standingsTable(g.table)}
      </section>`).join("");
    return `
      <header class="page-head">
        <span class="eyebrow">World Cup 2026</span>
        <h1>Group stage</h1>
        <p>Each group table is built from that group's fixtures only.</p>
      </header>
      <div class="group-grid">${cards || emptyBox("No group data available.")}</div>`;
  }

  async function team(name) {
    const t = await getJSON(`/teams/${encodeURIComponent(name)}`);
    const club = t.club;
    const national = t.national;
    const initials = t.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();

    const facts = [];
    if (club) {
      facts.push(["Competition", "Premier League"]);
      facts.push(["Elo", club.elo ?? "–"]);
      facts.push(["League position", club.standing ? `${club.standing.position}` : "–"]);
      facts.push(["Points", club.standing ? club.standing.points : "–"]);
      facts.push(["Title odds", fmtPct(club.title_probability)]);
    }
    if (national) {
      facts.push(["Strength modifier", national.strength_modifier ?? "–"]);
      const tp = national.tactical_profile || {};
      if (tp.possession != null) facts.push(["Possession style", `${tp.possession}`]);
      if (tp.pressing != null) facts.push(["Pressing", `${tp.pressing}`]);
    }

    const fixtures = t.fixtures.map(matchRow).join("") || emptyBox("No fixtures on record.");

    return `
      <header class="page-head">
        <div class="card team-hero">
          <div style="display:flex;align-items:center;gap:16px">
            <span class="badge" aria-hidden="true">${esc(initials)}</span>
            <div>
              <span class="eyebrow" style="margin-bottom:4px">${club ? "Club" : "National team"}</span>
              <h1 style="font-size:clamp(1.5rem,4vw,2.2rem)">${esc(t.name)}</h1>
            </div>
          </div>
          <a href="#/matches" class="pill">All matches</a>
        </div>
      </header>
      <div class="grid grid-2">
        <section class="card">
          <div class="card-head"><h2>Profile</h2></div>
          ${facts.length
            ? `<dl class="kv">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="mono">${esc(v)}</dd></div>`).join("")}</dl>`
            : emptyBox("No profile data for this team.")}
        </section>
        <section class="card">
          <div class="card-head"><h2>Fixtures</h2><span class="muted small">${t.fixtures.length} total</span></div>
          <div class="match-list">${fixtures}</div>
        </section>
      </div>`;
  }

  // ---------- router ----------

  const NAV_PAGES = { "": "overview", matches: "matches", "premier-league": "premier-league", "world-cup": "world-cup", team: "" };

  function parseHash() {
    const path = location.hash.replace(/^#\/?/, "");
    const parts = path.split("/").map((p) => {
      try { return decodeURIComponent(p); } catch { return p; }
    });
    return { page: parts[0] || "", arg: parts.slice(1).join("/"), search: new URLSearchParams(location.hash.split("?")[1] || "") };
  }

  function setActiveNav(key) {
    document.querySelectorAll("[data-nav]").forEach((a) => {
      if (a.dataset.nav === key) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  async function render() {
    const { page, arg, search } = parseHash();
    setActiveNav(NAV_PAGES[page] ?? "");
    app.innerHTML = `<p class="loading">Loading…</p>`;
    app.setAttribute("aria-busy", "true");
    try {
      let html;
      if (page === "" ) html = await overview();
      else if (page === "matches") html = await matches({
        competition: search.get("competition") || "",
        status: search.get("status") || "",
        team: search.get("team") || "",
      });
      else if (page === "premier-league") html = await premierLeague();
      else if (page === "world-cup") html = await worldCup();
      else if (page === "team" && arg) html = await team(arg);
      else html = errorBox("That page does not exist.");
      app.innerHTML = html;
      bindFilters();
    } catch (err) {
      app.innerHTML = errorBox(err.message || "Something went wrong.");
    } finally {
      app.setAttribute("aria-busy", "false");
      window.scrollTo({ top: 0 });
    }
  }

  function bindFilters() {
    const form = document.getElementById("match-filters");
    if (!form) return;
    // Refresh only the results list, so the search box keeps focus while typing.
    const update = async () => {
      const fd = new FormData(form);
      const q = new URLSearchParams();
      for (const [k, v] of fd.entries()) if (v) q.set(k, String(v).trim());
      history.replaceState(null, "", `#/matches${q.toString() ? `?${q}` : ""}`);
      const list = document.getElementById("match-list");
      const count = document.getElementById("match-count");
      try {
        const items = await getJSON(`/matches?${q}`);
        list.innerHTML = items.map(matchRow).join("") || emptyBox("No matches for these filters.");
        count.textContent = `${items.length} match${items.length === 1 ? "" : "es"} match your filters.`;
      } catch (err) {
        list.innerHTML = errorBox(err.message);
      }
    };
    form.querySelectorAll("select").forEach((el) => el.addEventListener("change", update));
    let timer;
    form.querySelector("#f-team").addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(update, 250);
    });
    form.addEventListener("submit", (e) => { e.preventDefault(); update(); });
  }

  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#/";
  render();
})();
