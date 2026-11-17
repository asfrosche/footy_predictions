"""Predict a club's next starting XI.

The best single guess is the XI from the club's last completed match. This module
adjusts that guess with the data the repo has:

1. Availability: FPL's chance of playing next round and its status. A player below
   50% or marked injured, suspended or unavailable is left out.
2. Rotation: after a short turnaround (3 days or less), a starter who has played
   little of the club's minutes is rested for a fit squad player at the same line
   who has played more.
3. Gaps: each missing slot is filled by the best-scoring fit squad player at the same
   line. The line counts come from the last match's formation.
4. One goalkeeper, always. Duplicate keeper records are collapsed.
5. Formation: the last match's formation is kept when the XI fits it, otherwise the
   XI's own shape is used.
6. Confidence: how much of the XI came from the last match, weighted with how fit
   the XI is. Notes say what changed and why.

The squad names come from the simulator's squad data. FPL names are matched to them
by full name, then by a unique surname within the club.
"""

from __future__ import annotations

import json
import unicodedata
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterable, Sequence

from ..models.player import Player

LINES = ("GK", "DEF", "MID", "FWD")
DOUBTFUL_BELOW = 0.5
REST_DAYS = 3
REST_MINUTES_SHARE = 0.4
SWAP_MARGIN = 0.1
UNAVAILABLE_STATUSES = {"i", "s", "u"}
MAX_RESTED = 2
DEFAULT_TARGET = {"DEF": 4, "MID": 3, "FWD": 3}

_TAG_LINE = {
    "GK": "GK", "GKP": "GK",
    "DEF": "DEF", "DF": "DEF",
    "MID": "MID", "MF": "MID",
    "FWD": "FWD", "FW": "FWD", "ST": "FWD", "AT": "FWD",
}


@dataclass(frozen=True)
class Fitness:
    """How likely a player is to start next match, from FPL data."""

    chance: float = 1.0
    status: str = "a"
    minutes_share: float | None = None  # minutes / the club's highest minutes; None when unknown
    form: float = 0.0
    news: str = ""

    @property
    def available(self) -> bool:
        return self.chance >= DOUBTFUL_BELOW and self.status not in UNAVAILABLE_STATUSES

    @property
    def score(self) -> float:
        """Ranking for replacements: availability first, then playing time, then form."""
        return 0.5 * self.chance + 0.3 * min(self.minutes_share or 0.0, 1.0) + 0.2 * min(self.form / 10, 1.0)

    def reason(self) -> str:
        if self.status in UNAVAILABLE_STATUSES:
            return {"i": "injured", "s": "suspended", "u": "unavailable"}[self.status]
        if self.news:
            return f"{round(self.chance * 100)}% to play: {self.news}"
        return f"{round(self.chance * 100)}% to play"


@dataclass
class PredictedLineup:
    formation: str
    starting_xi: list[Player]
    confidence: float
    notes: list[str] = field(default_factory=list)


def line_of(player: Player) -> str:
    """The pitch line for a player: GK, DEF, MID or FWD."""
    tags = {_TAG_LINE.get(p.upper()) for p in player.positions}
    for line in LINES:
        if line in tags:
            return line
    return "MID"


def _key(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", normalized.lower())).strip()


def _same_person(a: str, b: str) -> bool:
    """Two normalized names that can be the same player: same surname, and the first names
    agree when both have one (a single-word name such as "Raya" matches on surname alone)."""
    ta, tb = a.split(), b.split()
    if not ta or not tb or ta[-1] != tb[-1]:
        return False
    return len(ta) == 1 or len(tb) == 1 or ta[0][0] == tb[0][0]


def load_fitness(path: str | Path) -> dict[tuple[str, str], Fitness]:
    """Read the FPL file into {(club, normalized name): Fitness}. Full and short names both work."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    players = data.get("players", [])
    team_max: dict[str, int] = {}
    for p in players:
        team_max[p["team"]] = max(team_max.get(p["team"], 0), int(p.get("minutes") or 0))

    table: dict[tuple[str, str], Fitness] = {}
    for p in players:
        team = p["team"]
        top = team_max.get(team, 0)
        chance = p.get("chance_of_playing")
        fitness = Fitness(
            chance=(chance / 100) if chance is not None else 1.0,
            status=p.get("status") or "a",
            minutes_share=(int(p.get("minutes") or 0) / top) if top else None,
            form=float(p.get("form") or 0.0),
            news=p.get("news") or "",
        )
        for name in {p.get("name"), p.get("full_name")}:
            if name:
                table[(team, _key(name))] = fitness
    return table


def make_fitness_lookup(table: dict[tuple[str, str], Fitness], team: str) -> Callable[[Player], Fitness]:
    """Fitness for a squad player of one club. Unknown players count as fit with unknown minutes."""
    club = {name: f for (t, name), f in table.items() if t == team}

    def lookup(player: Player) -> Fitness:
        key = _key(player.name)
        if key in club:
            return club[key]
        matches = {id(f): f for n, f in club.items() if _same_person(n, key)}
        if len(matches) == 1:
            return next(iter(matches.values()))
        return Fitness()

    return lookup


def resolve_names(names: Iterable[str], squad: Sequence[Player]) -> tuple[list[Player], list[str]]:
    """Match match-report names to squad players. Returns (players, names not matched)."""
    by_key = {_key(p.name): p for p in squad}
    resolved: list[Player] = []
    unmatched: list[str] = []
    for name in names:
        key = _key(name)
        player = by_key.get(key)
        if player is None:
            same_surname = [p for p in squad if _same_person(_key(p.name), key)]
            if len(same_surname) == 1:
                player = same_surname[0]
        if player is None:
            # Short names: "Evanilson" for "Francisco Evanilson de Lima Barbosa". Every word of
            # the match name must appear in exactly one squad name.
            words = set(key.split())
            contained = [p for p in squad if words and words <= set(_key(p.name).split())]
            if len(contained) == 1:
                player = contained[0]
        if player is None:
            unmatched.append(name)
        elif all(player is not r for r in resolved):
            resolved.append(player)
    return resolved, unmatched


def rest_days(team: str, matches_data: dict, now: datetime | None = None) -> int | None:
    """Days between the team's last completed match and its next scheduled one."""
    now = now or datetime.now(timezone.utc)

    def when(match: dict) -> datetime | None:
        raw = match.get("date")
        if not raw:
            return None
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))

    def plays(match: dict) -> bool:
        return team.lower() in (
            str(match.get("home", {}).get("name", "")).lower(),
            str(match.get("away", {}).get("name", "")).lower(),
        )

    last = [when(m) for m in matches_data.get("completed", []) if plays(m)]
    nxt = [when(m) for m in matches_data.get("upcoming", []) if plays(m)]
    last = [d for d in last if d is not None and d <= now]
    nxt = [d for d in nxt if d is not None and d > now]
    if not last or not nxt:
        return None
    return (min(nxt) - max(last)).days


def _parse_formation(formation: str | None) -> dict[str, int] | None:
    if not formation:
        return None
    parts = [int(p) for p in formation.split("-") if p.isdigit()]
    if len(parts) == 3 and sum(parts) == 10:
        return {"DEF": parts[0], "MID": parts[1], "FWD": parts[2]}
    if len(parts) == 4 and sum(parts) == 10:
        return {"DEF": parts[0], "MID": parts[1] + parts[2], "FWD": parts[3]}
    return None


def _needed_line(kept: Sequence[Player], last_formation: str | None) -> str:
    """The outfield line the formation is most short of. Used when a slot has no
    specific line to refill, such as a duplicate keeper record being removed."""
    target = _parse_formation(last_formation) or DEFAULT_TARGET
    counts = {line: sum(1 for p in kept if line_of(p) == line) for line in ("DEF", "MID", "FWD")}
    return max(("DEF", "MID", "FWD"), key=lambda line: target[line] - counts[line])


def taken(players: Iterable[Player]) -> set[str]:
    """Normalized names of the given players, for exclusion checks."""
    return {_key(p.name) for p in players}


def _unique(players: Iterable[Player]) -> list[Player]:
    seen: set[str] = set()
    out: list[Player] = []
    for p in players:
        k = _key(p.name)
        if k not in seen:
            seen.add(k)
            out.append(p)
    return out


def predict_lineup(
    squad: Sequence[Player],
    last_xi: Sequence[Player],
    last_formation: str | None,
    fitness: Callable[[Player], Fitness],
    days_rest: int | None = None,
    unmatched: Sequence[str] = (),
) -> PredictedLineup:
    """Start from the last XI and replace the players who will not start.

    Every replacement takes the same line as the player it replaces, so the team's
    shape stays as it was in the last match. The formation is kept from that match.
    """
    notes: list[str] = [f"{name} played last match but is not in the squad data" for name in unmatched]
    base = _unique(last_xi)
    kept: list[Player] = []
    vacated: list[tuple[str, str]] = []  # (line, name of the player who will not start)

    for p in base:
        f = fitness(p)
        if f.available:
            kept.append(p)
        else:
            notes.append(f"{p.name} left out: {f.reason()}")
            vacated.append((line_of(p), p.name))

    if days_rest is not None and days_rest <= REST_DAYS:
        # Only starters with known minutes are rotation candidates: the least-used go first.
        rotation = sorted(
            (p for p in kept if line_of(p) != "GK"
             and fitness(p).minutes_share is not None
             and fitness(p).minutes_share < REST_MINUTES_SHARE),
            key=lambda p: fitness(p).minutes_share,
        )
        for p in rotation[:MAX_RESTED]:
            line = line_of(p)
            out_of_xi = taken(base) - taken(kept)
            sub = _best(line, squad, taken(kept) | out_of_xi, fitness)
            if sub is not None and fitness(sub).score > fitness(p).score + SWAP_MARGIN:
                # The replacement is the slot's new player, so the slot is filled here
                # and is not queued for another replacement below.
                kept.remove(p)
                kept.append(sub)
                notes.append(f"{p.name} rested after {days_rest} days' rest; {sub.name} starts")

    keepers = [p for p in kept if line_of(p) == "GK"]
    if len(keepers) > 1:
        best = max(keepers, key=lambda p: fitness(p).score)
        for p in keepers:
            if p is not best:
                kept.remove(p)
                vacated.append((_needed_line(kept, last_formation), p.name))
                notes.append(f"{p.name} not picked: one goalkeeper starts")

    excluded = {_key(name) for _, name in vacated} | {_key(p.name) for p in base if p not in kept}
    for line, name in vacated:
        if line == "GK" and any(line_of(p) == "GK" for p in kept):
            continue  # a keeper is already in goal; never add a second
        sub = _best(line, squad, taken(kept) | excluded, fitness)
        if sub is None:
            sub = _best(None, squad, taken(kept) | excluded, fitness, keeper_ok=line != "GK")
        if sub is not None:
            kept.append(sub)
            notes.append(f"{sub.name} starts for {name}")

    if not any(line_of(p) == "GK" for p in kept):
        sub = _best("GK", squad, taken(kept) | excluded, fitness)
        if sub is not None:
            kept.append(sub)
            notes.append(f"{sub.name} starts in goal")

    while len(kept) < 11:
        has_keeper = any(line_of(p) == "GK" for p in kept)
        sub = _best(None, squad, taken(kept) | excluded, fitness, keeper_ok=not has_keeper)
        if sub is None:
            break
        kept.append(sub)
        notes.append(f"{sub.name} starts to complete the XI")

    base_keys = taken(base)
    overlap = sum(1 for p in kept if _key(p.name) in base_keys) / 11
    fitness_mean = sum(fitness(p).chance for p in kept) / len(kept) if kept else 0.0
    confidence = round(0.6 * overlap + 0.4 * fitness_mean, 2)
    if last_formation:
        formation = last_formation
    else:
        counts = {line: sum(1 for p in kept if line_of(p) == line) for line in ("DEF", "MID", "FWD")}
        formation = f"{counts['DEF']}-{counts['MID']}-{counts['FWD']}"
    return PredictedLineup(formation=formation, starting_xi=kept, confidence=confidence, notes=notes)


def _best(
    line: str | None,
    squad: Sequence[Player],
    exclude: set[str],
    fitness: Callable[[Player], Fitness],
    keeper_ok: bool = True,
) -> Player | None:
    candidates = [
        p for p in squad
        if _key(p.name) not in exclude
        and (line is None or line_of(p) == line)
        and (keeper_ok or line_of(p) != "GK")
        and fitness(p).available
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda p: (fitness(p).score, p.name))
