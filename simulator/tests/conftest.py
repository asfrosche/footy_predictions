"""Test configuration.

Tests listed in SKIPPED_NO_SOURCE assert specific values from hand-entered tactical,
manager and experience profiles. Those profiles had no verifiable source and were
removed, so the assertions no longer have data to check against. They are skipped with
the reason shown, rather than deleted, so they can be re-enabled if sourced data returns.
"""
import pytest

REASON = "needs sourced tactical/manager/experience profiles; the unsourced versions were removed"

SKIPPED_NO_SOURCE = {
    "simulator/tests/test_pl_isolation.py::test_isolation_is_order_independent[pl_first]",
    "simulator/tests/test_pl_isolation.py::test_isolation_is_order_independent[wc_first]",
    "simulator/tests/test_pl_isolation.py::test_pl_scope_is_neutral_during_the_run_then_restored",
    "simulator/tests/test_pl_isolation.py::test_wc_scope_is_on_during_a_wc_run",
    "simulator/tests/test_v4_improved.py::ManagerProfileTests::test_bielsa_high_risk_pressing",
    "simulator/tests/test_v4_improved.py::ManagerProfileTests::test_manager_profile_structure",
    "simulator/tests/test_v4_improved.py::ManagerProfileTests::test_nagelsmann_high_flexibility",
    "simulator/tests/test_v4_improved.py::ManagerProfileTests::test_top_teams_have_managers",
    "simulator/tests/test_v4_improved.py::ManagerProfileTests::test_tuchel_balanced",
    "simulator/tests/test_v4_improved.py::UpdatedProfileTests::test_germany_high_press",
    "simulator/tests/test_v4_improved.py::UpdatedProfileTests::test_spain_high_possession_quality",
    "simulator/tests/test_v4_improved.py::UpdatedProfileTests::test_uruguay_low_block",
    "simulator/tests/test_v4_improved.py::DefensiveStyleTests::test_all_defensive_styles_appear_in_profiles",
    "simulator/tests/test_v4_improved.py::DefensiveStyleTests::test_defensive_style_interaction_returns_adjustments",
    "simulator/tests/test_v4_improved.py::DefensiveStyleTests::test_high_press_vs_low_block_produces_effects",
    "simulator/tests/test_v4_improved.py::V4ImprovedEngineTests::test_v4_improved_debug_mode",
    "simulator/tests/test_v4_tactical_engine.py::TacticalProfileTests::test_all_48_teams_have_profiles",
    "simulator/tests/test_v4_tactical_engine.py::TacticalMatchupTests::test_high_line_exploited_by_pace",
    "simulator/tests/test_v4_tactical_engine.py::TacticalMatchupTests::test_possession_vs_low_block",
    "simulator/tests/test_v4_tactical_engine.py::TacticalMatchupTests::test_set_piece_mismatch",
    "simulator/tests/test_v4_tactical_engine.py::TacticalMatchupTests::test_strong_press_vs_weak_buildup",
}


def pytest_collection_modifyitems(config, items):
    for item in items:
        if item.nodeid.replace("\\", "/") in SKIPPED_NO_SOURCE:
            item.add_marker(pytest.mark.skip(reason=REASON))
