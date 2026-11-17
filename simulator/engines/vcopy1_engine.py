"""vcopy1: a small neural network that predicts home / draw / away, then a scoreline.

Port of AndrewCarterUK/football-predictor (MIT, 2018, "Beating the Bookmakers with
TensorFlow"). The original used TensorFlow 1.x and a DNNClassifier. This port keeps the
same ideas, without TensorFlow:

- Features: each team's totals over its last 10 matches (wins, draws, losses, goals,
  goals conceded, shots, shots on target, and the same two for the opponent). Home and
  away features are concatenated, 18 values in all.
- Model: one hidden layer of 10 ReLU units, then a 3-way softmax (H, D, A).
- Training: Adagrad (learning rate 0.1) with L1 proximal shrinkage (0.001), batches of
  500, 20,000 steps. Same settings as the original TensorFlow run.
- Scorelines: the network gives the outcome. The score comes from two independent
  Poisson goal counts, using each team's goals per match over its last 10, and the
  first pair that matches the sampled outcome is used.

Data: the original training file (book.csv, 2008 to 2018) is kept in
simulator/data/vcopy1/. Current-season results can be added with extra_csv_paths, in
the same football-data.co.uk format. Teams with no recent matches get league-average
form and are listed in fallback_teams.
"""

from __future__ import annotations

import csv
import datetime as dt
from bisect import bisect_left
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Sequence

import numpy as np

from ..competitions.premier_league import canonical_team_name
from .base_engine import MatchEngine

SIMULATOR_DIR = Path(__file__).resolve().parents[1]
DEFAULT_TRAINING_CSV = SIMULATOR_DIR / "data" / "vcopy1" / "book.csv"

FORM_MATCHES = 10
OUTCOMES = ("H", "D", "A")
# Historical names in the football-data files that canonical_team_name does not map.
LOCAL_ALIASES = {"Hull": "Hull City"}
MAX_SCORE_ATTEMPTS = 200
FALLBACK_SCORES = {"H": (1, 0), "D": (1, 1), "A": (0, 1)}


def _team(name: str) -> str:
    raw = name.strip()
    return canonical_team_name(LOCAL_ALIASES.get(raw, raw))


def _parse_date(text: str) -> dt.date | None:
    for fmt in ("%d/%m/%y", "%d/%m/%Y"):
        try:
            return dt.datetime.strptime(text.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _side_stats(row: dict, side: str) -> np.ndarray:
    """Per-match stats for one team: the 9 values the original Dataset used."""
    other = "A" if side == "H" else "H"
    goals = int(row[f"FT{side}G"])
    conceded = int(row[f"FT{other}G"])
    result = row["FTR"]
    return np.array([
        1 if result == side else 0,        # wins
        1 if result == "D" else 0,         # draws
        1 if result == other else 0,       # losses
        goals,
        conceded,
        int(row[f"{side}S"]),              # shots
        int(row[f"{side}ST"]),             # shots on target
        int(row[f"{other}S"]),             # opposition shots
        int(row[f"{other}ST"]),            # opposition shots on target
    ], dtype=float)


def read_matches(paths: Iterable[Path]) -> list[dict]:
    """Read football-data style files. Rows with missing results or stats are skipped."""
    matches = []
    for path in paths:
        path = Path(path)
        if not path.exists():
            continue
        with path.open(encoding="utf-8-sig", errors="replace", newline="") as fh:
            for row in csv.DictReader(fh):
                date = _parse_date(row.get("Date", ""))
                if date is None or row.get("FTR") not in OUTCOMES:
                    continue
                try:
                    home_stats = _side_stats(row, "H")
                    away_stats = _side_stats(row, "A")
                except (TypeError, ValueError):
                    continue
                matches.append({
                    "date": date,
                    "home": _team(row["HomeTeam"]),
                    "away": _team(row["AwayTeam"]),
                    "result": row["FTR"],
                    "home_stats": home_stats,
                    "away_stats": away_stats,
                })
    matches.sort(key=lambda m: m["date"])
    return matches


class _TeamHistory:
    """Each team's matches in date order, so the form before any date is a bisect."""

    def __init__(self, matches: list[dict]) -> None:
        self._dates: dict[str, list[dt.date]] = {}
        self._stats: dict[str, list[np.ndarray]] = {}
        for m in matches:
            for team, stats in ((m["home"], m["home_stats"]), (m["away"], m["away_stats"])):
                self._dates.setdefault(team, []).append(m["date"])
                self._stats.setdefault(team, []).append(stats)

    def form_before(self, team: str, date: dt.date) -> np.ndarray | None:
        """Totals over the last FORM_MATCHES matches strictly before date, or None."""
        dates = self._dates.get(team, [])
        k = bisect_left(dates, date)
        if k < FORM_MATCHES:
            return None
        return np.sum(self._stats[team][k - FORM_MATCHES:k], axis=0)

    def latest_form(self, team: str) -> np.ndarray | None:
        """The team's last FORM_MATCHES matches, scaled to 10 if it has fewer."""
        stats = self._stats.get(team)
        if not stats:
            return None
        recent = stats[-FORM_MATCHES:]
        return np.sum(recent, axis=0) * (FORM_MATCHES / len(recent))


@lru_cache(maxsize=8)
def _train(paths: tuple[str, ...], seed: int, steps: int) -> dict:
    """Train once per data set and cache the result. Returns weights and form data."""
    matches = read_matches(Path(p) for p in paths)
    history = _TeamHistory(matches)

    features, labels = [], []
    for m in matches:
        hf = history.form_before(m["home"], m["date"])
        af = history.form_before(m["away"], m["date"])
        if hf is None or af is None:
            continue
        features.append(np.concatenate([hf, af]))
        labels.append(OUTCOMES.index(m["result"]))
    if not features:
        raise ValueError("vcopy1 needs at least one training match with 10 earlier matches per team")

    x = np.array(features)
    y = np.array(labels)
    split = int(0.95 * len(x))  # same split as the original: last 5% held out for testing
    params = _fit(x[:split], y[:split], seed=seed, steps=steps)
    test_accuracy = float(np.mean(_predict_classes(params, x[split:]) == y[split:])) if len(x) > split else None

    all_forms = [history.latest_form(team) for team in list(history._stats)]
    league_form = np.mean([f for f in all_forms if f is not None], axis=0)
    return {
        "params": params,
        "history": history,
        "league_form": league_form,
        "training_matches": len(x),
        "test_accuracy": test_accuracy,
    }


def _softmax(logits: np.ndarray) -> np.ndarray:
    shifted = logits - logits.max(axis=-1, keepdims=True)
    e = np.exp(shifted)
    return e / e.sum(axis=-1, keepdims=True)


def _forward(params: dict, x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    z1 = x @ params["W1"] + params["b1"]
    h = np.maximum(z1, 0.0)
    logits = h @ params["W2"] + params["b2"]
    return z1, _softmax(logits)


def _predict_classes(params: dict, x: np.ndarray) -> np.ndarray:
    _, probs = _forward(params, x)
    return probs.argmax(axis=1)


def _fit(x: np.ndarray, y: np.ndarray, seed: int, steps: int, batch: int = 500,
         hidden: int = 10, learning_rate: float = 0.1, l1: float = 0.001,
         initial_accumulator: float = 0.1) -> dict:
    """Mini-batch training with Adagrad and L1 proximal shrinkage (as ProximalAdagrad)."""
    rng = np.random.default_rng(seed)
    d = x.shape[1]

    def glorot(fan_in: int, fan_out: int) -> np.ndarray:
        limit = np.sqrt(6.0 / (fan_in + fan_out))
        return rng.uniform(-limit, limit, size=(fan_in, fan_out))

    params = {
        "W1": glorot(d, hidden), "b1": np.zeros(hidden),
        "W2": glorot(hidden, 3), "b2": np.zeros(3),
    }
    accum = {k: np.full_like(v, initial_accumulator) for k, v in params.items()}

    n = len(x)
    for _ in range(steps):
        idx = rng.integers(0, n, size=min(batch, n))
        xb, yb = x[idx], y[idx]
        z1, probs = _forward(params, xb)
        h = np.maximum(z1, 0.0)

        d_logits = probs.copy()
        d_logits[np.arange(len(yb)), yb] -= 1.0
        d_logits /= len(yb)
        grads = {"W2": h.T @ d_logits, "b2": d_logits.sum(axis=0)}
        d_h = d_logits @ params["W2"].T
        d_z1 = d_h * (z1 > 0)
        grads["W1"] = xb.T @ d_z1
        grads["b1"] = d_z1.sum(axis=0)

        for name, g in grads.items():
            accum[name] += g * g
            lr_t = learning_rate / np.sqrt(accum[name])
            v = params[name] - lr_t * g
            params[name] = np.sign(v) * np.maximum(np.abs(v) - lr_t * l1, 0.0)
    return params


class VCopy1Engine(MatchEngine):
    """Match engine: network outcome probabilities plus Poisson scorelines."""

    def __init__(
        self,
        extra_csv_paths: Sequence[Path] = (),
        training_csv: Path = DEFAULT_TRAINING_CSV,
        seed: int = 0,
        steps: int = 20000,
        minimum_lambda: float = 0.05,
        tournament_form: dict[str, float] | None = None,
    ) -> None:
        paths = tuple(str(p) for p in (training_csv, *extra_csv_paths))
        trained = _train(paths, seed, steps)
        self._params = trained["params"]
        self._history: _TeamHistory = trained["history"]
        self._league_form: np.ndarray = trained["league_form"]
        self.training_matches: int = trained["training_matches"]
        self.test_accuracy: float | None = trained["test_accuracy"]
        self.minimum_lambda = minimum_lambda
        self.fallback_teams: set[str] = set()
        self._rng = np.random.default_rng(seed)

    def _form(self, team: str) -> np.ndarray:
        form = self._history.latest_form(team)
        if form is None:
            self.fallback_teams.add(team)
            return self._league_form
        return form

    def outcome_probabilities(self, team1: str, team2: str) -> dict[str, float]:
        x = np.concatenate([self._form(team1), self._form(team2)])[None, :]
        _, probs = _forward(self._params, x)
        return dict(zip(OUTCOMES, probs[0].tolist()))

    def simulate_match(self, team1: str, team2: str, can_draw: bool = True) -> tuple[int, int]:
        probs = self.outcome_probabilities(team1, team2)
        weights = np.array([probs["H"], probs["D"], probs["A"]])
        if not can_draw:
            weights[1] = 0.0
        weights = weights / weights.sum()
        outcome = OUTCOMES[self._rng.choice(3, p=weights)]

        lam1 = max(self.minimum_lambda, float(self._form(team1)[3]) / FORM_MATCHES)
        lam2 = max(self.minimum_lambda, float(self._form(team2)[3]) / FORM_MATCHES)
        for _ in range(MAX_SCORE_ATTEMPTS):
            g1 = int(self._rng.poisson(lam1))
            g2 = int(self._rng.poisson(lam2))
            scored = "H" if g1 > g2 else "A" if g2 > g1 else "D"
            if scored == outcome:
                return g1, g2
        return FALLBACK_SCORES[outcome]
