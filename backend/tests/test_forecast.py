"""Behavioral tests for the uncalibrated v0.1 forecast."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.forecast.assumptions import example_request
from app.forecast.engine import run_forecast
from app.forecast.models import ForecastRunRequest
from app.main import FORECAST_LOCK, app, post_forecast


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def _one_year_request() -> ForecastRunRequest:
    request = example_request()
    request.sample_count = 32
    request.scenario.horizon_years = 1
    assert request.baseline is not None
    request.baseline.horizon_years = 1
    return request


def _assert_ordered(p10: float, p50: float, p90: float) -> None:
    assert p10 <= p50 <= p90


def test_forecast_is_reproducible() -> None:
    request = _one_year_request()
    first = run_forecast(request)
    second = run_forecast(request)

    assert first.run_id == second.run_id
    assert first.scenario == second.scenario
    assert first.baseline == second.baseline
    assert first.deltas == second.deltas
    assert first.sensitivities == second.sensitivities


def test_outputs_obey_physical_and_quantile_constraints() -> None:
    result = run_forecast(_one_year_request())

    assert len(result.scenario.periods) == 12
    for period in result.scenario.periods:
        for metric in (
            period.installed_it_mw,
            period.effective_utilization,
            period.it_energy_mwh,
            period.facility_energy_mwh,
            period.operational_carbon_t,
            period.average_pue,
            period.peak_facility_mw,
        ):
            _assert_ordered(metric.p10, metric.p50, metric.p90)
        assert 0.0 <= period.effective_utilization.p10
        assert period.effective_utilization.p90 <= 0.99
        assert period.average_pue.p10 >= 1.02
        assert period.it_energy_mwh.p10 >= 0.0
        assert period.facility_energy_mwh.p10 >= period.it_energy_mwh.p10
        assert period.operational_carbon_t.p10 >= 0.0

    horizon = result.scenario.horizons[0]
    assert horizon.years == 1
    assert horizon.cumulative_facility_energy_mwh.p50 > 0.0
    assert horizon.cumulative_operational_carbon_t.p50 > 0.0


def test_efficient_design_beats_conventional_baseline() -> None:
    result = run_forecast(_one_year_request())

    assert result.baseline is not None
    assert len(result.deltas) == 1
    delta = result.deltas[0]
    assert delta.facility_energy_mwh.p50 < 0.0
    assert delta.operational_carbon_t.p50 < 0.0
    assert delta.facility_energy_pct_p50 < 0.0
    assert delta.operational_carbon_pct_p50 < 0.0


def test_lower_pue_reduces_energy_with_identical_demand() -> None:
    higher_request = _one_year_request()
    higher_request.baseline = None
    higher_request.scenario.facility.design_pue = 1.50

    lower_request = higher_request.model_copy(deep=True)
    lower_request.scenario.facility.design_pue = 1.15

    higher = run_forecast(higher_request)
    lower = run_forecast(lower_request)

    higher_energy = higher.scenario.horizons[0].cumulative_facility_energy_mwh.p50
    lower_energy = lower.scenario.horizons[0].cumulative_facility_energy_mwh.p50
    assert lower_energy < higher_energy


def test_forecast_api_exposes_metadata_example_and_results() -> None:
    client = TestClient(app)

    metadata = client.get("/forecast/metadata")
    assert metadata.status_code == 200
    assert metadata.json()["calibration_status"] == "uncalibrated"

    example = client.get("/forecast/example")
    assert example.status_code == 200
    payload = example.json()
    payload["sample_count"] = 32
    payload["scenario"]["horizon_years"] = 1
    payload["baseline"]["horizon_years"] = 1

    response = client.post("/forecast", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["provenance"]["model_version"] == "0.1.0"
    assert len(body["scenario"]["periods"]) == 12
    assert body["baseline"] is not None


def test_forecast_api_does_not_allow_unknown_browser_origins() -> None:
    client = TestClient(app)
    response = client.options(
        "/forecast",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert "access-control-allow-origin" not in response.headers


@pytest.mark.anyio
async def test_forecast_api_rejects_overlapping_runs() -> None:
    await FORECAST_LOCK.acquire()
    try:
        with pytest.raises(HTTPException) as error:
            await post_forecast(_one_year_request())
    finally:
        FORECAST_LOCK.release()

    assert error.value.status_code == 429
