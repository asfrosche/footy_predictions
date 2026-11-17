from __future__ import annotations

import random
from pathlib import Path
from typing import Any

from numpy.random import poisson

from ..models.player import Player
from ..models.squad import Squad
from ..models.team_strength import (
    DEFAULT_POSITION_FORMULAS,
    TeamStrength,
    assign_roles,
    build_team_strength,
)
from ..services.v2_data_loader import load_v2_squads
from .base_engine import MatchEngine, shootout_leader_probability
from .v3_dynamic_engine import _load_config


class V2PlayerMatchEngine(MatchEngine):
    def __init__(
        self,
        data_dir: str | Path | None = None,
        squads: dict[str, Squad] | None = None,
        formulas: dict[str, dict[str, float]] | None = None,
        tournament_form: dict[str, float] | None = None,
        base_goals: float | None = None,
        attack_weight_defense: float = 0.70,
        attack_weight_goalkeeper: float = 0.30,
        midfield_control_weight: float = 0.25,
        minimum_lambda: float | None = None,
        extra_time_lambda_scale: float | None = None,
        tiebreaker_base_probability: float | None = None,
        tiebreaker_delta_scale: float | None = None,
        curve_factor: float | None = None,
        curve_min: float | None = None,
        curve_max: float | None = None,
    ) -> None:
        # Share calibration with V3 so the two engines do not disagree on the
        # same squads (V2 previously hardcoded a 2.5 curve and a 1.10 base).
        cfg = _load_config()
        sc = cfg.get("strength_curve", {})
        base_goals = cfg.get("base_goals", 1.10) if base_goals is None else base_goals
        minimum_lambda = cfg.get("minimum_lambda", 0.05) if minimum_lambda is None else minimum_lambda
        extra_time_lambda_scale = cfg.get("extra_time_lambda_scale", 0.30) if extra_time_lambda_scale is None else extra_time_lambda_scale
        tiebreaker_base_probability = cfg.get("tiebreaker_base_probability", 0.50) if tiebreaker_base_probability is None else tiebreaker_base_probability
        tiebreaker_delta_scale = cfg.get("tiebreaker_delta_scale", 0.0005) if tiebreaker_delta_scale is None else tiebreaker_delta_scale
        self.curve_factor = sc.get("curve_factor", 3.0) if curve_factor is None else curve_factor
        self.curve_min = sc.get("min_multiplier", 0.20) if curve_min is None else curve_min
        self.curve_max = sc.get("max_multiplier", 3.0) if curve_max is None else curve_max
        self.data_dir = Path(data_dir) if data_dir else None
        self.squads = squads if squads is not None else load_v2_squads(self.data_dir)
        self.formulas = formulas or DEFAULT_POSITION_FORMULAS
        self._tournament_form = tournament_form or {}
        self.base_goals = base_goals
        self.attack_weight_defense = attack_weight_defense
        self.attack_weight_goalkeeper = attack_weight_goalkeeper
        self.midfield_control_weight = midfield_control_weight
        self.minimum_lambda = minimum_lambda
        self.extra_time_lambda_scale = extra_time_lambda_scale
        self.tiebreaker_base_probability = tiebreaker_base_probability
        self.tiebreaker_delta_scale = tiebreaker_delta_scale
        self.last_match_debug = ""

    def simulate_match(
        self,
        team1: str,
        team2: str,
        can_draw: bool = True,
    ) -> tuple[int, int]:
        score, _ = self.simulate_match_debug(team1, team2, can_draw)
        return score

    def simulate_match_debug(
        self,
        team1: str,
        team2: str,
        can_draw: bool = True,
    ) -> tuple[tuple[int, int], str]:
        strength1 = self.get_team_strength(team1)
        strength2 = self.get_team_strength(team2)
        lambda1, lambda2 = self.expected_goals(strength1, strength2)
        g1 = poisson(max(self.minimum_lambda, lambda1))
        g2 = poisson(max(self.minimum_lambda, lambda2))
        if not can_draw and g1 == g2:
            g1_et = poisson(lambda1 * self.extra_time_lambda_scale)
            g2_et = poisson(lambda2 * self.extra_time_lambda_scale)
            if g1_et != g2_et:
                g1 += g1_et
                g2 += g2_et
            else:
                leader = shootout_leader_probability(
                    self.tiebreaker_base_probability, lambda1 - lambda2, self.tiebreaker_delta_scale,
                )
                if random.random() < leader:
                    g1 += 1
                else:
                    g2 += 1
        score = (int(g1), int(g2))
        self.last_match_debug = self.format_match_debug(
            team1,
            team2,
            strength1,
            strength2,
            (lambda1, lambda2),
            score,
        )
        return score, self.last_match_debug

    def get_team_strength(self, team: str) -> TeamStrength:
        squad = self.squads[team]
        return build_team_strength(team, squad.current_starting_xi, squad.formation, self.formulas)

    def expected_goals(
        self,
        team1_strength: TeamStrength,
        team2_strength: TeamStrength,
    ) -> tuple[float, float]:
        lambda1 = self._expected_goals_for(team1_strength, team2_strength)
        lambda2 = self._expected_goals_for(team2_strength, team1_strength)
        return round(lambda1, 6), round(lambda2, 6)

    def format_match_debug(
        self,
        team1: str,
        team2: str,
        team1_strength: TeamStrength,
        team2_strength: TeamStrength,
        expected_goals: tuple[float, float],
        score: tuple[int, int],
    ) -> str:
        lines = [
            f"{team1} vs {team2}",
            "",
            "Starting XI:",
            *self._format_starting_xi(team1_strength),
            "",
            "Ratings:",
            f"Attack: {team1_strength.attack_rating:.1f}",
            f"Midfield: {team1_strength.midfield_rating:.1f}",
            f"Defense: {team1_strength.defense_rating:.1f}",
            f"Goalkeeper: {team1_strength.goalkeeper_rating:.1f}",
            "",
            "Expected Goals:",
            f"{team1}: {expected_goals[0]:.2f}",
            f"{team2}: {expected_goals[1]:.2f}",
            "",
            f"Score: {score[0]}-{score[1]}",
        ]
        return "\n".join(lines)

    def _expected_goals_for(
        self,
        attacking: TeamStrength,
        defending: TeamStrength,
    ) -> float:
        defensive_index = (
            self.attack_weight_defense * defending.defense_rating
            + self.attack_weight_goalkeeper * defending.goalkeeper_rating
        )
        attack_ratio = attacking.attack_rating / max(defensive_index, 1.0)
        midfield_modifier = 1.0 + self.midfield_control_weight * (
            (attacking.midfield_rating - defending.midfield_rating) / 100.0
        )
        curve_value = attack_ratio ** self.curve_factor
        curve_value = max(self.curve_min, min(self.curve_max, curve_value))
        xg = self.base_goals * curve_value * midfield_modifier
        team = attacking.team
        form_mult = 1.0 + self._tournament_form.get(team, 0.0) / 1500.0
        return xg * form_mult

    def _format_starting_xi(self, strength: TeamStrength) -> list[str]:
        squad = self.squads[strength.team]
        role_assignments = assign_roles(squad.current_starting_xi, squad.formation)
        by_role: dict[str, list[str]] = {
            "GK": [],
            "Defense": [],
            "Midfield": [],
            "Attack": [],
        }
        for player, role in role_assignments:
            if role == "GK":
                by_role["GK"].append(player.name)
            elif role in {"CB", "FB"}:
                by_role["Defense"].append(player.name)
            elif role in {"CM", "DM"}:
                by_role["Midfield"].append(player.name)
            else:
                by_role["Attack"].append(player.name)
        lines = [f"Formation: {squad.formation}"]
        for label in ("GK", "Defense", "Midfield", "Attack"):
            lines.append("")
            lines.append(label + ":")
            lines.extend(f"  {name}" for name in by_role[label])
        return lines
