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

  // Official crests for clubs that have one. Other clubs keep their initials.
  const CLUB_CRESTS = {
    "Arsenal": "arsenal.svg",
    "Aston Villa": "aston-villa.png",
    "Brentford": "brentford.svg",
    "Brighton & Hove Albion": "brighton.png",
    "Everton": "everton.png",
    "Fulham": "fulham.svg",
    "Leeds United": "leeds.png",
    "Liverpool": "liverpool.svg",
    "Manchester United": "man-united.png",
  };
  const crestHTML = (name, cls = "crest") => CLUB_CRESTS[name]
    ? `<img class="${cls}" src="/img/clubs/${CLUB_CRESTS[name]}" alt="" width="20" height="20">`
    : "";

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

  // Most recent match first. Undated fixtures ("TBC") sort to the bottom.
  const newestFirst = (list) =>
    [...list].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

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
            <span class="team-name home with-crest ${homeWon ? "winner" : ""}">${crestHTML(m.home)}<span>${esc(m.home)}</span></span>
            <span class="score ${done ? "" : "pending"} mono">${esc(score)}</span>
            <span class="team-name away with-crest ${awayWon ? "winner" : ""}">${crestHTML(m.away)}<span>${esc(m.away)}</span></span>
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

  // ---------- homepage ----------

  const outcomeBar = (p) => `
    <div class="outcome-bar" role="img" aria-label="Home ${fmtPct(p.home)}, draw ${fmtPct(p.draw)}, away ${fmtPct(p.away)}">
      <span class="seg home" style="width:${p.home}%"></span>
      <span class="seg draw" style="width:${p.draw}%"></span>
      <span class="seg away" style="width:${p.away}%"></span>
    </div>`;

  const bigMatchCard = (m) => `
    <article class="big-match">
      <div class="big-match-top">
        <span class="pill">${esc(m.competition_name)}</span>
        <span class="faint">${esc(fmtDate(m.date))}</span>
      </div>
      <div class="big-match-teams">
        <span class="team-name home">${teamLink(m.home)}</span>
        <span class="vs">vs</span>
        <span class="team-name away">${teamLink(m.away)}</span>
      </div>
      ${outcomeBar(m.implied_probability)}
      <div class="big-match-probs mono">
        <span><b>${fmtPct(m.implied_probability.home)}</b> Home</span>
        <span><b>${fmtPct(m.implied_probability.draw)}</b> Draw</span>
        <span><b>${fmtPct(m.implied_probability.away)}</b> Away</span>
      </div>
    </article>`;

  const favouriteRow = (m) => {
    const p = m.implied_probability;
    const side = p.home >= p.away ? "home" : "away";
    const name = m[side];
    return `
      <div class="fav-row">
        <div class="fav-main">
          <div class="team-name">${teamLink(name)}</div>
          <div class="faint small">${esc(m.home)} v ${esc(m.away)} · ${esc(fmtDate(m.date))}</div>
        </div>
        <span class="score mono">${fmtPct(p[side])}</span>
      </div>`;
  };

  const TOOLKIT = [
    { title: "Fixtures", text: "Every match, filterable by competition, status and team.", href: "#/matches" },
    { title: "Premier League", text: "League table, title race and match odds with the margin removed.", href: "#/premier-league" },
    { title: "World Cup", text: "Group tables built from each group's own fixtures.", href: "#/world-cup" },
    { title: "Team profiles", text: "Club or national team profile with its fixtures.", href: "#/premier-league" },
    { title: "AI predictions", text: "Win, draw and away chances for every match.", soon: true },
    { title: "Value bets", text: "Where the model rates a price better than the bookmaker.", soon: true },
    { title: "Live scores", text: "In-play scores and live stats.", soon: true },
    { title: "Trends", text: "Streaks for home wins, BTTS and over 2.5 goals.", soon: true },
  ];

  const toolCard = (t) => {
    const inner = `<h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>${t.soon ? `<span class="pill muted-pill">Coming soon</span>` : ""}`;
    return t.soon
      ? `<div class="tool soon">${inner}</div>`
      : `<a class="tool" href="${esc(t.href)}">${inner}</a>`;
  };

  async function overview() {
    const s = await getJSON("/home");
    const tabs = [
      ["favourites", "Favourites"],
      ["title", "Title race"],
      ["results", "Results"],
      ["fixtures", "Fixtures"],
    ];
    const panels = {
      favourites: s.favourites.map(favouriteRow).join("") || emptyBox("No priced fixtures yet."),
      title: `<div class="card-head"><span class="muted small">Model approximation</span></div>${bars(s.title_race, "team", "probability", fmtPct)}`,
      results: `<div class="match-list">${s.latest_results.map(matchRow).join("") || emptyBox("No results yet.")}</div>`,
      fixtures: `<div class="match-list">${s.next_fixtures.map(matchRow).join("") || emptyBox("No upcoming fixtures.")}</div>`,
    };

    return `
      <section class="hero">
        <span class="eyebrow">Football stats & odds</span>
        <h1>Match probabilities, straight from the prices.</h1>
        <p>Fixtures, results, tables and bookmaker odds for the Premier League and World Cup.
           Probabilities are worked out from the odds with the margin removed.</p>
        <div class="hero-actions">
          <a class="btn primary" href="#/premier-league">Premier League</a>
          <a class="btn" href="#/matches">All fixtures</a>
        </div>
      </section>

      <div class="stats">
        <div class="stat">
          <div class="stat-label">Matches tracked</div>
          <div class="stat-value mono">${s.matches_tracked}</div>
          <div class="stat-sub">Completed and upcoming</div>
        </div>
        <div class="stat">
          <div class="stat-label">Completed</div>
          <div class="stat-value mono">${s.completed_count}</div>
          <div class="stat-sub">Full-time results</div>
        </div>
        <div class="stat">
          <div class="stat-label">Upcoming</div>
          <div class="stat-value mono">${s.upcoming_count}</div>
          <div class="stat-sub">Fixtures still to play</div>
        </div>
        <div class="stat">
          <div class="stat-label">Leagues</div>
          <div class="stat-value mono">${s.leagues}</div>
          <div class="stat-sub">Premier League and World Cup</div>
        </div>
      </div>

      <div class="section-head">
        <h2>Big matches</h2>
        <span class="muted small">Next priced fixtures · home, draw, away</span>
      </div>
      <div class="big-grid">
        ${s.featured.map(bigMatchCard).join("") || emptyBox("No priced fixtures coming up.")}
      </div>

      <div class="section-head">
        <h2>Sharpest numbers</h2>
        <span class="muted small">Favourites, title race, results and fixtures</span>
      </div>
      <section class="card">
        <div class="tabs" role="tablist" aria-label="Sharpest numbers">
          ${tabs.map(([key, label], i) => `
            <button class="tab" role="tab" id="tab-${key}" aria-controls="panel-${key}"
                    aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(label)}</button>`).join("")}
        </div>
        ${tabs.map(([key], i) => `
          <div class="tab-panel" role="tabpanel" id="panel-${key}" aria-labelledby="tab-${key}" ${i === 0 ? "" : "hidden"}>
            ${panels[key]}
          </div>`).join("")}
      </section>

      <div class="section-head">
        <h2>The toolkit</h2>
        <span class="muted small">Live tools link through; the rest are being built</span>
      </div>
      <div class="toolkit">${TOOLKIT.map(toolCard).join("")}</div>

      <p class="disclaimer">
        Probabilities and odds are for information only. They are not betting advice.
        Please gamble responsibly, and only if you are 18 or over.
      </p>`;
  }

  function bindTabs() {
    const tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return;
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const select = (tab, focus = true) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t) => t.addEventListener("click", () => select(t)));
    tablist.addEventListener("keydown", (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let next = null;
      if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      if (next === null) return;
      e.preventDefault();
      select(tabs[next]);
    });
  }

  async function matches(query) {
    const params = new URLSearchParams();
    if (query.competition) params.set("competition", query.competition);
    if (query.status) params.set("status", query.status);
    if (query.team) params.set("team", query.team);
    const list = newestFirst(await getJSON(`/matches?${params}`));
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
            ${crestHTML(t.name, "crest crest-lg") || `<span class="badge" aria-hidden="true">${esc(initials)}</span>`}
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

  // ---------- upcoming fixtures and model versions ----------

  const MODEL_KEYS = ["v1", "v2", "v3", "v4", "v5", "v6"];
  let upcomingIndex = {};

  const fixtureButton = (f) => `
    <button class="fixture" type="button" data-fixture="${esc(f.id)}">
      <span class="fixture-date faint small">${esc(fmtDate(f.date))}</span>
      <span class="fixture-teams">
        <span class="team-name home with-crest">${crestHTML(f.home)}<span>${esc(f.home)}</span></span>
        <span class="vs">vs</span>
        <span class="team-name away with-crest">${crestHTML(f.away)}<span>${esc(f.away)}</span></span>
      </span>
      <span class="fixture-tag small">${f.models ? "Six versions" : "Simulation pending"}</span>
    </button>`;

  const modelCard = (key, p) => {
    if (!p) {
      return `<div class="model-card"><div class="model-head"><span class="model-name">${esc(key)}</span></div>
              <p class="faint small">Not simulated yet.</p></div>`;
    }
    return `
      <div class="model-card">
        <div class="model-head">
          <span class="model-name">${esc(key)}</span>
          <span class="score mono">${esc(p.likely_score)}</span>
        </div>
        ${outcomeBar(p)}
        <div class="big-match-probs mono">
          <span><b>${fmtPct(p.home)}</b> H</span>
          <span><b>${fmtPct(p.draw)}</b> D</span>
          <span><b>${fmtPct(p.away)}</b> A</span>
        </div>
      </div>`;
  };

  function openFixture(id) {
    const f = upcomingIndex[id];
    const dlg = document.getElementById("model-dialog");
    if (!f || !dlg) return;
    const models = f.models || {};
    const market = f.market
      ? ` · Market ${fmtPct(f.market.home)} / ${fmtPct(f.market.draw)} / ${fmtPct(f.market.away)}`
      : "";
    dlg.innerHTML = `
      <form method="dialog" class="model-close-form">
        <button class="model-close" aria-label="Close">×</button>
      </form>
      <h3 id="model-dialog-title">${esc(f.home)} v ${esc(f.away)}</h3>
      <p class="faint small">${esc(fmtDate(f.date))}${esc(market)}</p>
      <a class="btn primary match-open" href="#/match/${esc(f.id)}">Open match</a>
      <div class="model-grid">${MODEL_KEYS.map((k) => modelCard(k, models[k])).join("")}</div>`;
    dlg.showModal();
  }

  async function upcoming() {
    const s = await getJSON("/premier-league/upcoming");
    upcomingIndex = {};
    s.gameweeks.forEach((g) => g.fixtures.forEach((f) => { upcomingIndex[f.id] = f; }));

    const run = s.model_run;
    const runNote = run.fixtures_simulated === run.fixtures_total
      ? `All ${run.fixtures_total} fixtures simulated, ${run.simulations_per_model} runs per version`
      : `${run.fixtures_simulated} of ${run.fixtures_total} fixtures simulated so far`;

    const sections = s.gameweeks.map((g) => `
      <section class="card gameweek">
        <div class="card-head">
          <h2>${g.gameweek == null ? "Other fixtures" : `Gameweek ${esc(g.gameweek)}`}</h2>
          <span class="muted small">From ${esc(fmtDate(g.start))}</span>
        </div>
        <div class="fixture-list">${g.fixtures.map(fixtureButton).join("")}</div>
      </section>`).join("");

    return `
      <header class="page-head">
        <span class="eyebrow">Premier League 2026/27</span>
        <h1>Upcoming fixtures</h1>
        <p>${esc(runNote)}. Select a fixture to see what each model version predicts.</p>
      </header>
      ${sections || emptyBox("No upcoming fixtures.")}
      <dialog id="model-dialog" class="model-dialog" aria-labelledby="model-dialog-title"></dialog>`;
  }

  function bindUpcoming() {
    const dlg = document.getElementById("model-dialog");
    if (!dlg) return;
    document.querySelectorAll(".fixture").forEach((btn) =>
      btn.addEventListener("click", () => openFixture(btn.dataset.fixture)));
    // A click on the backdrop closes the dialog.
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  }

  // ---------- match page: six model versions on one fixture ----------

  function matchView(f) {
    const models = f.models || {};
    const sourceText = f.models_source
      ? `${f.models_source.type === "live" ? "Live run" : "Stored run"}, ${f.models_source.simulations_per_model} simulations per version`
      : "Not simulated yet";
    const market = f.market
      ? `<section class="card market-card">
           <div class="card-head"><h2>Market odds</h2><span class="muted small">Margin removed</span></div>
           ${outcomeBar(f.market)}
           <div class="big-match-probs mono">
             <span><b>${fmtPct(f.market.home)}</b> Home</span>
             <span><b>${fmtPct(f.market.draw)}</b> Draw</span>
             <span><b>${fmtPct(f.market.away)}</b> Away</span>
           </div>
           ${f.market_prices ? `<p class="faint small mono" style="margin-top:10px">Decimal ${f.market_prices.home} / ${f.market_prices.draw} / ${f.market_prices.away}</p>` : ""}
         </section>`
      : "";
    return `
      <header class="page-head">
        <a class="back" href="#/upcoming">← Upcoming fixtures</a>
        <span class="eyebrow">${esc(f.competition_name)}${f.matchday ? ` · Gameweek ${esc(f.matchday)}` : ""}</span>
        <h1>${esc(f.home)} v ${esc(f.away)}</h1>
        <p>${esc(fmtDate(f.date))}</p>
      </header>
      ${market}
      <section class="card" style="margin-top:16px">
        <div class="card-head">
          <h2>Six model versions</h2>
          <span class="muted small" id="models-source">${esc(sourceText)}</span>
        </div>
        <div class="run-bar">
          <label class="small muted" for="sims">Simulations per version</label>
          <select id="sims">
            <option value="200">200</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
          </select>
          <button class="btn primary" type="button" id="run-models" data-fixture="${esc(f.id)}">Run models</button>
        </div>
        <div class="model-grid" id="model-grid">${MODEL_KEYS.map((k) => modelCard(k, models[k])).join("")}</div>
      </section>`;
  }

  async function matchPage(id) {
    return matchView(await getJSON(`/premier-league/fixtures/${encodeURIComponent(id)}`));
  }

  function bindMatch() {
    const btn = document.getElementById("run-models");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const sims = document.getElementById("sims").value;
      const source = document.getElementById("models-source");
      btn.disabled = true;
      btn.textContent = "Running…";
      try {
        const f = await getJSON(`/premier-league/fixtures/${encodeURIComponent(btn.dataset.fixture)}?run=true&sims=${encodeURIComponent(sims)}`);
        document.getElementById("model-grid").innerHTML = MODEL_KEYS.map((k) => modelCard(k, f.models[k])).join("");
        source.textContent = `Live run, ${sims} simulations per version`;
      } catch (err) {
        source.textContent = err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = "Run models";
      }
    });
  }

  // ---------- router ----------

  const NAV_PAGES = { "": "overview", matches: "matches", "premier-league": "premier-league", "world-cup": "world-cup", upcoming: "upcoming", match: "upcoming", team: "" };

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
      else if (page === "upcoming") html = await upcoming();
      else if (page === "match" && arg) html = await matchPage(arg);
      else if (page === "team" && arg) html = await team(arg);
      else html = errorBox("That page does not exist.");
      app.innerHTML = html;
      bindFilters();
      bindTabs();
      bindUpcoming();
      bindMatch();
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
        const items = newestFirst(await getJSON(`/matches?${q}`));
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
