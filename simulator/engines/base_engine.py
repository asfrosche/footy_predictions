from __future__ import annotations


class MatchEngine:
    def simulate_match(
        self,
        team1: str,
        team2: str,
        can_draw: bool = True,
    ) -> tuple[int, int]:
        raise NotImplementedError

    def notify_match(self, team1: str, team2: str, goals1: int, goals2: int, is_real: bool) -> None:
        pass


def shootout_leader_probability(
    base_probability: float,
    lambda_diff: float,
    delta_scale: float,
    adjustment: float = 0.0,
) -> float:
    """Probability that team1 wins a deadlocked knockout tie.

    Shared by V1-V4 so every engine uses the same rule. The driver is the
    expected-goals difference (not a raw rating difference), and the result is
    clamped so it stays a valid probability.
    """
    prob = base_probability + lambda_diff * delta_scale * 10.0 + adjustment
    return max(0.05, min(0.95, prob))
