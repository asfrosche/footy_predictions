from datetime import datetime, timezone

from simulator.models.player import Player
from simulator.services.lineup_prediction import (
    Fitness,
    line_of,
    predict_lineup,
    rest_days,
    resolve_names,
)


def player(name: str, pos: str) -> Player:
    return Player(name=name, country="England", positions=(pos,))


def squad_11() -> list[Player]:
    return [
        player("Keeper One", "GK"),
        player("Back One", "DEF"), player("Back Two", "DEF"), player("Back Three", "DEF"), player("Back Four", "DEF"),
        player("Mid One", "MID"), player("Mid Two", "MID"), player("Mid Three", "MID"),
        player("Fwd One", "FWD"), player("Fwd Two", "FWD"), player("Fwd Three", "FWD"),
    ]


def bench() -> list[Player]:
    return [player("Back Bench", "DEF"), player("Mid Bench", "MID"), player("Fwd Bench", "FWD"), player("Keeper Two", "GK")]


def table(**overrides: Fitness) -> dict[str, Fitness]:
    return dict(overrides)


def lookup(fit: dict[str, Fitness]):
    return lambda p: fit.get(p.name, Fitness())


def test_line_of_reads_position_tags():
    assert line_of(player("A", "GKP")) == "GK"
    assert line_of(player("B", "DEF")) == "DEF"
    assert line_of(player("C", "FWD")) == "FWD"


def test_injured_starter_is_replaced_from_the_same_line():
    squad = squad_11() + bench()
    xi = squad_11()
    fit = table(**{"Mid One": Fitness(chance=0.0, status="i")})
    result = predict_lineup(squad, xi, "4-3-3", lookup(fit))
    names = [p.name for p in result.starting_xi]
    assert "Mid One" not in names
    assert "Mid Bench" in names
    assert len(names) == 11
    assert result.formation == "4-3-3"
    assert any("Mid One left out" in n for n in result.notes)


def test_doubtful_player_below_half_is_left_out():
    squad = squad_11() + bench()
    fit = table(**{"Fwd One": Fitness(chance=0.25, status="d")})
    result = predict_lineup(squad, squad_11(), "4-3-3", lookup(fit))
    assert "Fwd One" not in [p.name for p in result.starting_xi]


def test_only_one_goalkeeper_starts_even_with_duplicate_records():
    xi = squad_11()
    xi[1] = player("Keeper Dup", "GKP")  # a second keeper record in place of a defender
    result = predict_lineup(squad_11() + bench(), xi, "4-3-3", lookup({}))
    keepers = [p for p in result.starting_xi if line_of(p) == "GK"]
    assert len(keepers) == 1
    assert len(result.starting_xi) == 11


def test_last_match_formation_is_kept():
    result = predict_lineup(squad_11() + bench(), squad_11(), "3-4-2-1", lookup({}))
    assert result.formation == "3-4-2-1"


def test_short_turnaround_rests_low_minutes_starter():
    fit = table(**{
        "Back Four": Fitness(minutes_share=0.1, form=2.0),
        "Back Bench": Fitness(minutes_share=0.9, form=6.0),
    })
    result = predict_lineup(squad_11() + bench(), squad_11(), "4-3-3", lookup(fit), days_rest=3)
    names = [p.name for p in result.starting_xi]
    assert "Back Four" not in names
    assert "Back Bench" in names


def test_normal_rest_does_not_rotate():
    fit = table(**{"Back Four": Fitness(minutes_share=0.1, form=2.0)})
    result = predict_lineup(squad_11() + bench(), squad_11(), "4-3-3", lookup(fit), days_rest=7)
    assert "Back Four" in [p.name for p in result.starting_xi]


def test_left_out_player_never_comes_back():
    fit = table(**{"Mid One": Fitness(chance=0.0, status="i")})
    result = predict_lineup(squad_11() + bench(), squad_11(), "4-3-3", lookup(fit))
    assert "Mid One" not in [p.name for p in result.starting_xi]


def test_confidence_is_high_when_the_team_is_fit():
    result = predict_lineup(squad_11() + bench(), squad_11(), "4-3-3", lookup({}))
    assert result.confidence == 1.0


def test_resolve_names_uses_unique_surname_fallback():
    squad = [player("Emerson Royal", "DEF"), player("Jaden Philogene", "MID")]
    resolved, unmatched = resolve_names(["Emerson Royal", "Philogene", "Nobody"], squad)
    assert [p.name for p in resolved] == ["Emerson Royal", "Jaden Philogene"]
    assert unmatched == ["Nobody"]


def test_rest_days_between_last_and_next_match():
    team = "Arsenal"
    match = lambda date, home, away: {"date": date, "home": {"name": home}, "away": {"name": away}}  # noqa: E731
    data = {
        "completed": [match("2026-11-01T15:00:00Z", "Arsenal", "Fulham")],
        "upcoming": [match("2026-11-05T15:00:00Z", "Chelsea", "Arsenal")],
    }
    now = datetime(2026, 11, 2, tzinfo=timezone.utc)
    assert rest_days(team, data, now=now) == 4
    assert rest_days("Nobody FC", data, now=now) is None


def test_rotation_replaces_each_rested_starter_once():
    fit = table(**{
        "Back Four": Fitness(minutes_share=0.1, form=2.0),
        "Back Bench": Fitness(minutes_share=0.9, form=6.0),
    })
    result = predict_lineup(squad_11() + bench(), squad_11(), "4-3-3", lookup(fit), days_rest=3)
    names = [p.name for p in result.starting_xi]
    assert len(names) == 11
    assert len(set(names)) == 11
    assert "Back Bench" in names
    assert "Back Four" not in names


def test_rested_player_is_not_picked_back_in():
    fit = table(**{
        "Back Four": Fitness(minutes_share=0.1, form=2.0),
        "Back Bench": Fitness(minutes_share=0.9, form=6.0),
    })
    result = predict_lineup(squad_11() + bench(), squad_11(), "4-3-3", lookup(fit), days_rest=3)
    assert "Back Four" not in [p.name for p in result.starting_xi]


def test_duplicate_keeper_is_replaced_by_the_line_the_formation_needs():
    xi = squad_11()
    xi[1] = player("Keeper Dup", "GKP")  # a second keeper record where Back One was
    result = predict_lineup(squad_11() + bench(), xi, "4-3-3", lookup({}))
    names = [p.name for p in result.starting_xi]
    assert len(names) == 11 and len(set(names)) == 11
    assert len([p for p in result.starting_xi if line_of(p) == "GK"]) == 1
    defenders = [p for p in result.starting_xi if line_of(p) == "DEF"]
    assert len(defenders) == 4  # 4-3-3 needs four defenders again


def test_surname_only_match_needs_a_compatible_first_name():
    from simulator.services.lineup_prediction import make_fitness_lookup, _same_person
    table_ = {("Club", "thiago silva"): Fitness(chance=0.0, status="i")}
    lookup_ = make_fitness_lookup(table_, "Club")
    assert lookup_(player("Bruno Silva", "DEF")).available  # different first name: not the injured man
    assert not lookup_(player("Thiago Silva", "DEF")).available
    assert _same_person("silva", "thiago silva")  # one-word name matches on surname
    assert not _same_person("bruno silva", "thiago silva")


def test_short_match_name_matches_a_longer_squad_name():
    squad = [player("Francisco Evanilson de Lima Barbosa", "FWD"), player("Rayan Vitor Simplicio Rocha", "FWD")]
    resolved, unmatched = resolve_names(["Evanilson", "Rayan", "Silva"], squad)
    assert [p.name for p in resolved] == ["Francisco Evanilson de Lima Barbosa", "Rayan Vitor Simplicio Rocha"]
    assert unmatched == ["Silva"]


def test_ambiguous_short_name_is_not_guessed():
    squad = [player("Bruno Silva", "DEF"), player("Thiago Silva", "DEF")]
    resolved, unmatched = resolve_names(["Silva"], squad)
    assert resolved == [] and unmatched == ["Silva"]
