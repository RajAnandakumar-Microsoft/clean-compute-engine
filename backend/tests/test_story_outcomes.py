"""Tests for the static voxel-story forecast catalog."""

from __future__ import annotations

from app.forecast.engine import run_forecast
from app.research.export_story_outcomes import (
    STORY_SAMPLE_COUNT,
    build_story_request,
    catalog_path,
    compact_story_result,
    validate_catalog,
)


def test_story_request_matches_browser_decisions() -> None:
    request = build_story_request("training", "air", 6, sample_count=32)

    assert request.seed == 73
    assert request.sample_count == 32
    assert request.scenario.horizon_years == 6
    assert request.scenario.facility.cooling == "air"
    assert request.scenario.facility.design_pue == 1.38
    assert request.scenario.workload_mix.training == 0.70
    assert [phase.it_capacity_mw for phase in request.scenario.phases] == [20, 30]
    assert all(phase.mature_utilization == 0.72 for phase in request.scenario.phases)

    assert request.baseline is not None
    assert request.baseline.horizon_years == 6
    assert request.baseline.facility.cooling == "air"
    assert request.baseline.facility.design_pue == 1.45
    assert request.baseline.facility.low_load_pue_penalty == 0.16
    assert all(
        phase.refresh_efficiency_gain == 0.04 for phase in request.baseline.phases
    )


def test_committed_story_catalog_is_complete() -> None:
    catalog = validate_catalog(catalog_path())

    assert catalog.sample_count == STORY_SAMPLE_COUNT
    assert len(catalog.outcomes) == 60
    assert catalog.outcomes["balanced:liquid:1"].scenario.years == 1
    assert catalog.outcomes["training:air:10"].scenario.years == 10


def test_committed_story_outcome_matches_forecast_engine() -> None:
    catalog = validate_catalog(catalog_path())
    request = build_story_request("balanced", "liquid", 1)

    expected = compact_story_result(run_forecast(request))

    assert catalog.outcomes["balanced:liquid:1"] == expected
