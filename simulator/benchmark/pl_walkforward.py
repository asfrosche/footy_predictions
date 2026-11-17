"""Walk-forward evaluation of Premier League goal level and match probabilities.

Every prediction for matchday k uses only matches from matchdays before k.

Two evaluations:

1. Results-only Poisson model (attack/defence ratings, home advantage), fitted on
   prior matchdays. It needs only results, so it runs on past seasons too. Seasons:
   2023/24, 2024/25 and 2025/26 (openfootball results) and 2026/27 (repo data).

2. V3 goal level on 2026/27: the V3 engine's expected goals are rescaled by a factor
   fitted only on prior matchdays, and the out-of-sample error of the rescaled
   forecast is reported.

All intervals are paired bootstrap intervals over matches (2000 resamples).
"""
from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.optimize import minimize
from scipy.stats import poisson

ROOT = Path(__file__).resolve().parents[2]
HISTORY_DIR = ROOT / "data" / "inputs" / "history"
PL_2026 = ROOT / "data" / "inputs" / "pl_matches.json"
OUT = ROOT / "data" / "generated" / "pl_walkforward.json"

MAX_GOALS = 10
BOOTSTRAP = 2000
SEED = 7
MIN_MATCHDAY_TO_PREDICT = 4  # need some prior data before forecasting

_MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], start=1)}
_ROUND_RE = re.compile(r"^[▪•]?\s*(?:Regular Season - |Matchday )(\d+)")
_DATE_RE = re.compile(r"^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\w{3}) (\d{1,2})(?: (\d{4}))?$")
# "19:00   Liverpool  4-2 (1-0)  Bournemouth" and "20:00  Burnley FC  0-3 (0-2)  Manchester City FC"
_SCORE_FIRST_RE = re.compile(r"^\s*(?:\d{1,2}:\d{2}\s+|\s{5})\s*(.+?)\s+(\d+)-(\d+)(?:\s+\(\d+-\d+\))?\s+(.+?)\s*$")
# "20:00  Manchester United FC    v Fulham FC   1-0 (0-0)"
_V_FORM_RE = re.compile(r"^\s*(?:\d{1,2}:\d{2}\s+)?(.+?)\s+v\s+(.+?)\s+(\d+)-(\d+)(?:\s+\(\d+-\d+\))?\s*$")


@dataclass(frozen=True)
class Match:
    season: str
    matchday: int
    date: str
    home: str
    away: str
    hg: int
    ag: int


def _clean(name: str) -> str:
    name = name.strip()
    for suffix in (" AFC", " FC"):
        if name.endswith(suffix) and len(name) > len(suffix):
            name = name[: -len(suffix)]
    return name.replace("AFC ", "", 1) if name.startswith("AFC ") else name


def _year_for(month: int, season: str) -> int:
    """Season 2024/25: August-December are 2024, January-June are 2025."""
    start = int(season.split("/")[0])
    return start if month >= 7 else start + 1


def parse_openfootball(path: Path, season: str) -> list[Match]:
    """Parse an openfootball England league file into matches (results only)."""
    matches: list[Match] = []
    matchday = 0
    date = ""
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        rm = _ROUND_RE.match(stripped)
        if rm:
            matchday = int(rm.group(1))
            continue
        dm = _DATE_RE.match(stripped)
        if dm:
            _, mon, day, year = dm.groups()
            month = _MONTHS[mon]
            y = int(year) if year else _year_for(month, season)
            date = f"{y}-{month:02d}-{int(day):02d}"
            continue
        if not matchday:
            continue
        vm = _V_FORM_RE.match(line)
        if vm:
            home, away, hg, ag = vm.group(1), vm.group(2), int(vm.group(3)), int(vm.group(4))
        else:
            sm = _SCORE_FIRST_RE.match(line)
            if not sm:
                continue
            home, hg, ag, away = sm.group(1), int(sm.group(2)), int(sm.group(3)), sm.group(4)
        matches.append(Match(season, matchday, date, _clean(home), _clean(away), hg, ag))
    return matches


def load_2026_27() -> list[Match]:
    raw = json.loads(PL_2026.read_text(encoding="utf-8"))
    out = []
    for m in raw["completed"]:
        out.append(Match("2026/27", int(m["matchday"]), m["date"][:10],
                         m["home"]["name"], m["away"]["name"],
                         int(m["home"]["score"]), int(m["away"]["score"])))
    return out


def load_all_seasons() -> dict[str, list[Match]]:
    seasons: dict[str, list[Match]] = {}
    for tag, label in (("2023-24", "2023/24"), ("2024-25", "2024/25"), ("2025-26", "2025/26")):
        seasons[label] = parse_openfootball(HISTORY_DIR / f"premierleague_{tag}.txt", label)
    seasons["2026/27"] = load_2026_27()
    return seasons


# ── Results-only Poisson model ─────────────────────────────────────────────

class PoissonRatings:
    """log lambda_home = mu + h + a[home] - d[away]; log lambda_away = mu + a[away] - d[home].

    Attack and defence are L2-penalised toward zero (weight ``ridge``), which makes the
    model identifiable and shrinks thinly-observed teams toward average.
    """

    def __init__(self, ridge: float = 1.0):
        self.ridge = ridge

    def fit(self, prior: list[Match], teams: list[str]) -> None:
        idx = {t: i for i, t in enumerate(teams)}
        n = len(teams)
        H = np.array([idx[m.home] for m in prior])
        A = np.array([idx[m.away] for m in prior])
        yh = np.array([m.hg for m in prior], dtype=float)
        ya = np.array([m.ag for m in prior], dtype=float)
        ridge = self.ridge

        def unpack(theta):
            return theta[0], theta[1], theta[2:2 + n], theta[2 + n:]

        def negll(theta):
            mu, h, a, d = unpack(theta)
            eta_h = mu + h + a[H] - d[A]
            eta_a = mu + a[A] - d[H]
            eh, ea = np.exp(eta_h), np.exp(eta_a)
            ll = np.sum(yh * eta_h - eh) + np.sum(ya * eta_a - ea)
            ll -= 0.5 * ridge * (np.sum(a ** 2) + np.sum(d ** 2))
            g = np.zeros_like(theta)
            rh, ra = yh - eh, ya - ea
            g[0] = np.sum(rh) + np.sum(ra)
            g[1] = np.sum(rh)
            np.add.at(g[2:2 + n], H, rh)
            np.add.at(g[2:2 + n], A, ra)
            np.add.at(g[2 + n:], A, -rh)
            np.add.at(g[2 + n:], H, -ra)
            g[2:2 + n] -= ridge * a
            g[2 + n:] -= ridge * d
            return -ll, -g

        theta0 = np.zeros(2 + 2 * n)
        theta0[0] = math.log(max(np.mean(np.concatenate([yh, ya])), 0.1))
        res = minimize(negll, theta0, jac=True, method="L-BFGS-B", options={"maxiter": 500})
        self._teams = idx
        self._mu, self._h, self._a, self._d = unpack(res.x)

    def expected(self, home: str, away: str) -> tuple[float, float]:
        ih = self._teams.get(home)
        ia = self._teams.get(away)
        if ih is None or ia is None:
            raise KeyError(f"unseen team in prior data: {home if ih is None else away}")
        lh = math.exp(self._mu + self._h + self._a[ih] - self._d[ia])
        la = math.exp(self._mu + self._a[ia] - self._d[ih])
        return lh, la


def league_average_expected(prior: list[Match]) -> tuple[float, float]:
    """Baseline with no team information: average home and away goals so far."""
    hg = np.mean([m.hg for m in prior])
    ag = np.mean([m.ag for m in prior])
    return float(hg), float(ag)


def outcome_probs(lh: float, la: float) -> tuple[float, float, float]:
    ph = poisson.pmf(np.arange(MAX_GOALS + 1), lh)
    pa = poisson.pmf(np.arange(MAX_GOALS + 1), la)
    grid = np.outer(ph, pa)
    home = float(np.tril(grid, -1).sum())
    draw = float(np.trace(grid))
    away = float(np.triu(grid, 1).sum())
    total = home + draw + away
    return home / total, draw / total, away / total


def _outcome(m: Match) -> int:
    return 0 if m.hg > m.ag else (1 if m.hg == m.ag else 2)


def walk_forward_season(matches: list[Match]) -> list[dict]:
    """Per-match forecasts for one season; each matchday is fitted on earlier matchdays only."""
    rows: list[dict] = []
    days = sorted({m.matchday for m in matches})
    teams = sorted({t for m in matches for t in (m.home, m.away)})
    for k in days:
        if k < MIN_MATCHDAY_TO_PREDICT:
            continue
        prior = [m for m in matches if m.matchday < k]
        todo = [m for m in matches if m.matchday == k]
        model = PoissonRatings()
        model.fit(prior, teams)
        base_h, base_a = league_average_expected(prior)
        for m in todo:
            lh, la = model.expected(m.home, m.away)
            rows.append({
                "season": m.season, "matchday": k, "home": m.home, "away": m.away,
                "total_actual": m.hg + m.ag, "total_pred": lh + la,
                "p_model": outcome_probs(lh, la), "p_base": outcome_probs(base_h, base_a),
                "outcome": _outcome(m),
            })
    return rows


def _logloss(p, o):
    return -math.log(max(p[o], 1e-9))


def _brier(p, o):
    return sum((p[j] - (1.0 if j == o else 0.0)) ** 2 for j in range(3))


def bootstrap_ci(values: list[float], seed: int = SEED) -> dict:
    """Mean with a 95% paired-bootstrap interval over matches."""
    arr = np.asarray(values, dtype=float)
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(arr), size=(BOOTSTRAP, len(arr)))
    means = arr[idx].mean(axis=1)
    return {
        "mean": round(float(arr.mean()), 4),
        "ci95": [round(float(np.quantile(means, 0.025)), 4), round(float(np.quantile(means, 0.975)), 4)],
        "n": int(len(arr)),
    }


def summarise(rows: list[dict]) -> dict:
    if not rows:
        return {}
    uniform = (1 / 3, 1 / 3, 1 / 3)
    ll_m = [_logloss(r["p_model"], r["outcome"]) for r in rows]
    ll_b = [_logloss(r["p_base"], r["outcome"]) for r in rows]
    ll_u = [_logloss(uniform, r["outcome"]) for r in rows]
    br_m = [_brier(r["p_model"], r["outcome"]) for r in rows]
    br_b = [_brier(r["p_base"], r["outcome"]) for r in rows]
    goal_err = [r["total_pred"] - r["total_actual"] for r in rows]
    abs_err = [abs(e) for e in goal_err]
    return {
        "matches": len(rows),
        "logloss_model": bootstrap_ci(ll_m),
        "logloss_league_average": bootstrap_ci(ll_b),
        "logloss_uniform": bootstrap_ci(ll_u),
        "logloss_model_minus_league_average": bootstrap_ci([a - b for a, b in zip(ll_m, ll_b)]),
        "brier_model_minus_league_average": bootstrap_ci([a - b for a, b in zip(br_m, br_b)]),
        "total_goals_error_pred_minus_actual": bootstrap_ci(goal_err),
        "total_goals_mae": bootstrap_ci(abs_err),
    }


def scaled_goal_level(base_rows: list[dict]) -> dict:
    """V3-style goal level: rescale predicted totals by a factor fitted on prior matchdays.

    ``base_rows`` must come from the V3 engine (prior-only xG deltas per matchday), with
    ``total_pred`` = V3 expected total and ``total_actual`` = real goals.
    """
    rows = sorted(base_rows, key=lambda r: (r["matchday"], r["home"]))
    out = []
    for r in rows:
        prior = [x for x in base_rows if x["matchday"] < r["matchday"]]
        if not prior:
            continue
        scale = sum(x["total_actual"] for x in prior) / max(sum(x["total_pred"] for x in prior), 1e-9)
        out.append({
            "unscaled_error": r["total_pred"] - r["total_actual"],
            "scaled_error": r["total_pred"] * scale - r["total_actual"],
            "scale": scale,
        })
    return {
        "unscaled_error": bootstrap_ci([x["unscaled_error"] for x in out]),
        "scaled_error": bootstrap_ci([x["scaled_error"] for x in out]),
        "scale_path_last5": [round(x["scale"], 3) for x in out][-5:],
    }


def v3_goal_level(matches_2026: list[Match]) -> dict:
    """Run the V3 engine per matchday on prior data only, then test a walk-forward goal scale."""
    import tempfile
    from simulator.competitions.premier_league import get_pl_config
    from simulator.engines import V3DynamicEngine
    from simulator.services import simulation_service as ss

    cfg = get_pl_config()
    squads = ss._build_squads(cfg)
    snap_dir = Path(tempfile.mkdtemp(prefix="v3wf_"))
    rows = []
    for k in sorted({m.matchday for m in matches_2026}):
        if k < MIN_MATCHDAY_TO_PREDICT:
            continue
        prior = [m for m in matches_2026 if m.matchday < k]
        snap = snap_dir / f"prior_{k:02d}.json"
        snap.write_text(json.dumps({"completed": [
            {"date": m.date, "home": {"name": m.home, "score": m.hg}, "away": {"name": m.away, "score": m.ag},
             "status": 0} for m in prior]}), encoding="utf-8")
        eng = V3DynamicEngine(data_dir=str(ROOT / "simulator"), squads=squads, team_metrics=cfg.team_metrics,
                              national_data=False, matches_file=str(snap))
        for m in (x for x in matches_2026 if x.matchday == k):
            lh, la = eng.expected_goals(eng.get_team_strength(m.home), eng.get_team_strength(m.away))
            rows.append({"matchday": k, "home": m.home, "total_pred": lh + la,
                         "total_actual": m.hg + m.ag})
    return scaled_goal_level(rows)


def run(include_v3: bool = True) -> dict:
    seasons = load_all_seasons()
    report: dict = {"method": "walk-forward; each matchday fitted on earlier matchdays only",
                    "seasons": {}, "pooled": {}, "v3_goal_level_2026_27": None}
    all_rows: list[dict] = []
    for label, matches in seasons.items():
        rows = walk_forward_season(matches)
        all_rows += rows
        report["seasons"][label] = {"matches_in_season": len(matches), "evaluation": summarise(rows)}
    report["pooled"] = summarise(all_rows)
    if include_v3:
        report["v3_goal_level_2026_27"] = v3_goal_level(seasons["2026/27"])
    return report


if __name__ == "__main__":
    report = run()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"wrote {OUT}")
    for label, v in report["seasons"].items():
        e = v["evaluation"]
        if e:
            d = e["logloss_model_minus_league_average"]
            g = e["total_goals_error_pred_minus_actual"]
            print(f"{label}: parsed {v['matches_in_season']}, evaluated {e['matches']}; "
                  f"logloss diff vs league avg {d['mean']} CI {d['ci95']}; goals bias {g['mean']} CI {g['ci95']}")
    p = report["pooled"]
    print(f"pooled: n={p['matches']} logloss diff {p['logloss_model_minus_league_average']['mean']} "
          f"CI {p['logloss_model_minus_league_average']['ci95']}")
    print("v3 2026/27:", json.dumps(report["v3_goal_level_2026_27"]))
