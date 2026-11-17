"""Run the six model versions (v1-v6) on one Premier League fixture.

The engines come from simulator/. They are built once, on first use, because
building them takes a few seconds. A lock keeps two requests from running the
engines at the same time.
"""

from __future__ import annotations

import sys
import threading
from collections import Counter
from pathlib import Path
from typing import Iterator

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

MODELS = ["v1", "v2", "v3", "v4", "v5", "v6"]

_lock = threading.Lock()
_engines: dict | None = None
_teams: set[str] = set()


def _load() -> None:
    global _engines, _teams
    if _engines is not None:
        return
    from simulator.competitions.premier_league import get_pl_config
    from simulator.services import simulation_service as svc

    config = get_pl_config()
    _teams = set(config.teams)
    _engines = {model: svc._competition_engine(model, config) for model in MODELS}


def _check_teams(home: str, away: str) -> None:
    for name in (home, away):
        if name not in _teams:
            raise ValueError(f"Unknown team for the models: {name}")


def _summarize(wins: Counter, scores: Counter, n: int) -> dict:
    """Shares of home / draw / away wins over n runs, and the most common scoreline."""
    if n == 0:
        return {"home": 0.0, "draw": 0.0, "away": 0.0, "likely_score": "–"}
    (best, _), = scores.most_common(1)
    return {
        "home": round(wins["home"] / n * 100, 1),
        "draw": round(wins["draw"] / n * 100, 1),
        "away": round(wins["away"] / n * 100, 1),
        "likely_score": f"{best[0]}-{best[1]}",
    }


def simulate(engine, home: str, away: str, sims: int) -> dict:
    wins: Counter = Counter()
    scores: Counter = Counter()
    for _ in range(sims):
        g1, g2 = engine.simulate_match(home, away)
        scores[(g1, g2)] += 1
        wins["home" if g1 > g2 else "away" if g2 > g1 else "draw"] += 1
    return _summarize(wins, scores, sims)


def predict(home: str, away: str, sims: int = 200) -> dict[str, dict]:
    """Run every model version on one fixture. Raises ValueError for unknown teams."""
    with _lock:
        _load()
        _check_teams(home, away)
        return {model: simulate(_engines[model], home, away, sims) for model in MODELS}


def predict_stream(home: str, away: str, sims: int = 200, chunk: int = 10) -> Iterator[dict]:
    """Yield running results while the simulations run.

    Every `chunk` simulations, each of the six versions has run that many more matches.
    Each yielded snapshot holds the results so far for every version, so the page can
    show the percentages moving. The last snapshot has finished=True.
    """
    with _lock:
        _load()
        _check_teams(home, away)
        wins = {m: Counter() for m in MODELS}
        scores = {m: Counter() for m in MODELS}
        done = 0
        while done < sims:
            step = min(chunk, sims - done)
            for model in MODELS:
                engine = _engines[model]
                for _ in range(step):
                    g1, g2 = engine.simulate_match(home, away)
                    scores[model][(g1, g2)] += 1
                    wins[model]["home" if g1 > g2 else "away" if g2 > g1 else "draw"] += 1
            done += step
            yield {
                "done": done,
                "total": sims,
                "finished": done == sims,
                "models": {m: _summarize(wins[m], scores[m], done) for m in MODELS},
            }
