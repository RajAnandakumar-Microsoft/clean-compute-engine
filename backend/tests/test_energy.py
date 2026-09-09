"""Physical invariants and claim boundaries for synthetic energy coupling."""

from __future__ import annotations

from datetime import date

import numpy as np
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.energy.dispatch import StorageState, dispatch_hours
from app.energy.engine import (
    cooling_water_requirement,
    grid_only_portfolio,
    run_coupling,
)
from app.energy.flexibility import defer_work
from app.energy.models import (
    CoolingWater,
    CouplingRequest,
    CouplingResult,
    GridConnection,
    SupplyPortfolio,
    WorkFlexibility,
)
from app.energy.resources import (
    GenerationHours,
    generation_hours,
    scenario_temperature,
)
from app.forecast.engine import PhaseHours, iter_hourly_demand, run_forecast
from app.forecast.models import ForecastRunRequest
from app.main import FORECAST_LOCK, app, post_coupling


def _generation(samples: int = 2, hours: int = 48) -> GenerationHours:
    return GenerationHours(
        *[np.zeros((samples, hours)) for _ in range(6)],
        np.zeros((samples, (hours + 23) // 24)),
    )


@pytest.fixture(scope="module")
def coupled_result() -> CouplingResult:
    return run_coupling(CouplingRequest(sample_count=32))


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def test_dispatch_conserves_energy_and_respects_every_limit() -> None:
    rng = np.random.default_rng(3)
    load = rng.uniform(2.0, 30.0, (4, 72))
    generation = _generation(4, 72)
    generation.solar[:] = rng.uniform(0.0, 24.0, load.shape)
    generation.wind[:] = rng.uniform(0.0, 6.0, load.shape)
    generation.nuclear[:] = 2.0
    generation.reservoir_capacity[:] = 3.0
    generation.reservoir_daily_budget[:] = 12.0
    generation.gas_capacity[:] = 2.0
    supply = SupplyPortfolio(
        battery_power_mw=8, battery_energy_mwh=20, battery_round_trip_efficiency=0.81
    )
    grid = GridConnection(import_limit_mw=4, export_limit_mw=3)
    state = StorageState.empty(4)
    flow = dispatch_hours(
        load, generation, np.full_like(load, 400.0), supply, grid, state
    )
    actual_generation = sum(
        flow[f"{name}_generation"]
        for name in ("solar", "wind", "hydro", "nuclear", "gas")
    )
    np.testing.assert_allclose(
        actual_generation
        + flow["grid_to_load"]
        + flow["battery_to_load"]
        + flow["unserved"],
        load + flow["battery_charge"] + flow["grid_export"],
        atol=1e-9,
    )
    delivered = sum(
        flow[f"{name}_to_load"]
        for name in ("solar", "wind", "hydro", "nuclear", "gas", "battery", "grid")
    )
    np.testing.assert_allclose(delivered + flow["unserved"], load, atol=1e-9)
    np.testing.assert_allclose(
        flow["battery_charge"].sum(axis=1) - flow["battery_to_load"].sum(axis=1),
        flow["battery_losses"].sum(axis=1) + state.energy,
        atol=1e-9,
    )
    assert np.all(flow["battery_state"] >= -1e-9)
    assert np.all(flow["battery_state"] <= 20.0 + 1e-9)
    assert np.all(flow["battery_charge"] <= 8.0)
    assert np.all(flow["battery_to_load"] <= 8.0)
    assert np.all(flow["battery_charge"] * flow["battery_to_load"] == 0.0)
    assert np.all(flow["grid_to_load"] <= 4.0)
    assert np.all(flow["grid_export"] <= 3.0)
    assert np.all(flow["gas_to_load"] <= 2.0)
    assert np.all(flow["renewable_served"] <= delivered + 1e-9)
    assert np.all(flow["hydro_generation"].reshape(4, 3, 24).sum(axis=2) <= 12.0 + 1e-9)
    assert flow["unserved"].sum() > 0.0
    assert flow["curtailed"].sum() > 0.0


@pytest.mark.parametrize("source,is_renewable", [("solar", True), ("nuclear", False)])
def test_storage_carries_charge_and_origin_between_batches(
    source: str, is_renewable: bool
) -> None:
    first = _generation(1, 24)
    getattr(first, source)[:, 23] = 20.0
    supply = SupplyPortfolio(
        battery_power_mw=4, battery_energy_mwh=10, battery_round_trip_efficiency=0.81
    )
    grid = GridConnection(import_limit_mw=0, export_limit_mw=0)
    state = StorageState.empty(1)
    load = np.ones((1, 24))
    carbon = np.full_like(load, 400.0)
    before = dispatch_hours(load, first, carbon, supply, grid, state)
    assert before["unserved"][0, 0] == 1.0
    assert state.energy[0] == pytest.approx(3.6)
    assert before["renewable_served"].sum() == pytest.approx(float(is_renewable))
    after = dispatch_hours(load, _generation(1, 24), carbon, supply, grid, state)
    assert after["battery_to_load"].sum() == pytest.approx(3.24)
    assert after["renewable_served"].sum() == pytest.approx(3.24 * is_renewable)
    assert before["battery_losses"].sum() + after[
        "battery_losses"
    ].sum() == pytest.approx(0.76)
    assert state.energy[0] == pytest.approx(0.0)
    assert state.renewable_energy[0] == pytest.approx(0.0)


def test_reservoir_has_a_finite_daily_energy_budget() -> None:
    generation = _generation(1, 48)
    generation.reservoir_capacity[:] = 4.0
    generation.reservoir_daily_budget[:] = 8.0
    load = np.full((1, 48), 2.0)
    flow = dispatch_hours(
        load,
        generation,
        np.full_like(load, 400),
        grid_only_portfolio(),
        GridConnection(import_limit_mw=None),
        StorageState.empty(1),
    )
    np.testing.assert_allclose(flow["hydro_generation"].reshape(2, 24).sum(axis=1), 8)
    assert flow["hydro_to_load"][0, 3] == 2
    assert flow["hydro_to_load"][0, 4] == 0
    assert flow["grid_to_load"][0, 4] == 2


def test_grid_does_not_charge_storage_or_create_renewable_credit() -> None:
    load = np.full((1, 24), 5.0)
    flow = dispatch_hours(
        load,
        _generation(1, 24),
        np.full_like(load, 400),
        SupplyPortfolio(),
        GridConnection(import_limit_mw=None),
        StorageState.empty(1),
    )
    np.testing.assert_allclose(flow["grid_to_load"], load)
    assert flow["battery_charge"].sum() == 0
    assert flow["renewable_served"].sum() == 0
    assert flow["operational_carbon"].sum() == pytest.approx(48)


def test_exports_do_not_receive_an_avoided_emissions_credit() -> None:
    generation = _generation(1, 24)
    generation.hydro[:] = 5.0
    supply = SupplyPortfolio(
        hydro_operational_g_per_kwh=100,
        battery_power_mw=0,
        battery_energy_mwh=0,
    )
    load = np.ones((1, 24))
    flow = dispatch_hours(
        load,
        generation,
        np.full_like(load, 400),
        supply,
        GridConnection(export_limit_mw=4),
        StorageState.empty(1),
    )
    assert flow["grid_export"].sum() == 96
    assert flow["renewable_served"].sum() == 24
    assert flow["operational_carbon"].sum() == pytest.approx(12)


def test_deferral_preserves_work_and_capacity() -> None:
    rng = np.random.default_rng(6)
    capacity = np.full((3, 48), 10.0)
    utilization = rng.uniform(0.2, 0.99, capacity.shape)
    phase = PhaseHours(capacity, utilization, np.ones_like(capacity), "H100")
    score = rng.uniform(0, 400, capacity.shape)
    scheduled, shifted = defer_work(
        [phase], score, WorkFlexibility(fraction=0.4, max_delay_hours=6)
    )
    original = (capacity * utilization).reshape(3, 2, 24).sum(axis=2)
    adjusted = (
        (scheduled[0].capacity * scheduled[0].utilization).reshape(3, 2, 24).sum(axis=2)
    )
    np.testing.assert_allclose(original, adjusted, atol=1e-9)
    assert np.all(scheduled[0].utilization <= 0.99 + 1e-12)
    assert np.all(scheduled[0].utilization >= 0)
    assert shifted.sum() > 0
    np.testing.assert_array_equal(phase.utilization, utilization)


def test_deferral_cannot_redefer_arrivals_or_cross_deadlines() -> None:
    capacity = np.full((1, 48), 10.0)
    utilization = np.zeros_like(capacity)
    utilization[0, 0] = 0.6
    utilization[0, 23] = 0.6
    phase = PhaseHours(capacity, utilization, np.ones_like(capacity), "H100")
    score = np.full_like(capacity, 400.0)
    score[0, 2] = 100.0
    score[0, 4] = 0.0
    score[0, 24] = 0.0
    scheduled, shifted = defer_work(
        [phase], score, WorkFlexibility(fraction=0.5, max_delay_hours=3)
    )
    assert scheduled[0].utilization[0, 2] == pytest.approx(0.3)
    assert scheduled[0].utilization[0, 4] == 0
    assert scheduled[0].utilization[0, 24] == 0
    assert scheduled[0].utilization[0, 23] == 0.6
    assert shifted.sum() == pytest.approx(3)


@pytest.mark.parametrize("case", ["typical", "hot-dry", "low-renewables"])
def test_resource_profiles_are_bounded_and_share_weather(case: str) -> None:
    request = CouplingRequest(sample_count=32, weather_case=case)
    batch = next(iter_hourly_demand(request.demand, 32, request.seed))
    ambient = scenario_temperature(request, batch)
    generation = generation_hours(request, batch, ambient, 0)
    assert np.all(generation.solar >= 0)
    assert np.all(generation.solar <= request.supply.solar_mw)
    assert np.all(generation.wind <= request.supply.wind_mw)
    assert np.all(generation.hydro <= request.supply.hydro_mw)
    assert np.all(generation.solar[:, ::24] == 0)
    if case == "hot-dry":
        np.testing.assert_allclose(ambient - batch.ambient, 8)
        ordinary = request.model_copy(update={"weather_case": "typical"})
        normal = generation_hours(ordinary, batch, batch.ambient, 0)
        assert generation.hydro.sum() < normal.hydro.sum()
        assert generation.solar.sum() <= normal.solar.sum()


def test_commissioning_date_and_reservoir_generation() -> None:
    request = CouplingRequest(sample_count=32)
    batch = next(iter_hourly_demand(request.demand, 32, request.seed))
    request.supply.hydro_mode = "reservoir-budget"
    request.supply.commissioning_date = date(2027, 1, 15)
    generation = generation_hours(request, batch, batch.ambient, 0)
    for field in ("solar", "wind", "nuclear", "gas_capacity", "reservoir_capacity"):
        assert getattr(generation, field)[:, : 14 * 24].sum() == 0
    assert generation.hydro.sum() == 0
    assert generation.reservoir_daily_budget[:, :14].sum() == 0
    assert generation.reservoir_daily_budget[:, 14:].sum() > 0
    assert generation.renewable_available[:, 14 * 24 :].sum() > 0


def test_solar_degrades_from_commissioning_not_forecast_start() -> None:
    request = CouplingRequest(sample_count=32)
    request.demand.start_date = date(2036, 1, 1)
    request.supply.commissioning_date = date(2036, 1, 1)
    batch = next(iter_hourly_demand(request.demand, 32, request.seed))
    newly_built = generation_hours(request, batch, batch.ambient, 0)

    longer_forecast = request.model_copy(deep=True)
    longer_forecast.demand.start_date = date(2027, 1, 1)
    longer_forecast.demand.horizon_years = 10
    commissioned_late = generation_hours(longer_forecast, batch, batch.ambient, 0)
    np.testing.assert_array_equal(commissioned_late.solar, newly_built.solar)

    older_plant = request.model_copy(deep=True)
    older_plant.supply.commissioning_date = date(2027, 1, 1)
    older = generation_hours(older_plant, batch, batch.ambient, 0)
    age_hours = float(
        (np.datetime64("2036-01-01", "h") - np.datetime64("2027-01-01", "h"))
        .astype("timedelta64[h]")
        .astype(float)
    )
    np.testing.assert_allclose(
        older.solar, newly_built.solar * 0.995 ** (age_hours / (365.2425 * 24))
    )
    assert older.solar.sum() < newly_built.solar.sum()


@pytest.mark.parametrize("rejection", ["dry", "hybrid", "evaporative"])
def test_cooling_water_is_separate_from_hydro_and_internal_cooling(
    rejection: str,
) -> None:
    power = np.full((1, 24), 10.0)
    ambient = np.full_like(power, 25)
    water = CoolingWater(heat_rejection=rejection)
    consumption = cooling_water_requirement(power, ambient, water)
    if rejection == "dry":
        assert consumption.sum() == 0
    else:
        assert consumption.sum() > 0
        assert (
            cooling_water_requirement(power, ambient + 8, water).sum()
            > consumption.sum()
        )


def test_grid_only_coupling_matches_existing_forecast() -> None:
    request = CouplingRequest(sample_count=32, supply=grid_only_portfolio())
    request.grid.import_limit_mw = None
    result = run_coupling(request)
    original = run_forecast(
        ForecastRunRequest(scenario=request.demand, sample_count=32, seed=request.seed)
    )
    assert result.proposed.summary == result.baseline.summary
    summary = original.scenario.horizons[0]
    assert result.baseline.summary.required_energy_mwh.p50 == pytest.approx(
        summary.cumulative_facility_energy_mwh.p50, abs=0.0001
    )
    assert result.baseline.summary.operational_carbon_t.p50 == pytest.approx(
        summary.cumulative_operational_carbon_t.p50, abs=0.0001
    )
    assert result.comparison.comparable
    assert result.comparison.carbon_change_pct_p50 == 0
    assert result.proposed.summary.hydro_water_consumption_l is not None
    assert result.proposed.summary.hydro_water_consumption_l.p50 == 0


def test_default_result_is_reproducible_and_trace_balances(
    coupled_result: CouplingResult,
) -> None:
    again = run_coupling(CouplingRequest(sample_count=32))
    assert coupled_result.run_id == again.run_id
    assert coupled_result.proposed == again.proposed
    assert coupled_result.hourly_trace == again.hourly_trace
    assert coupled_result.comparison.comparable
    assert coupled_result.proposed.summary.hydro_water_consumption_l is None
    assert len(coupled_result.hourly_trace) == 168
    assert len(coupled_result.proposed.periods) == 12
    assert coupled_result.provenance.classification == "synthetic"
    assert any(
        "Hydro water consumption" in warning for warning in coupled_result.warnings
    )
    for hour in coupled_result.hourly_trace:
        served = sum(
            (
                hour.solar_to_load_mw,
                hour.wind_to_load_mw,
                hour.hydro_to_load_mw,
                hour.nuclear_to_load_mw,
                hour.battery_to_load_mw,
                hour.gas_to_load_mw,
                hour.grid_to_load_mw,
                hour.unserved_mw,
            )
        )
        assert served == pytest.approx(hour.required_load_mw, abs=5e-6)
        generated = sum(
            (
                hour.solar_generation_mw,
                hour.wind_generation_mw,
                hour.hydro_generation_mw,
                hour.nuclear_generation_mw,
                hour.gas_generation_mw,
            )
        )
        assert (
            generated
            + hour.grid_to_load_mw
            + hour.battery_to_load_mw
            + hour.unserved_mw
            == pytest.approx(
                hour.required_load_mw + hour.battery_charge_mw + hour.grid_export_mw,
                abs=1e-5,
            )
        )
        assert hour.cooling_water_withdrawal_l >= hour.cooling_water_consumption_l
        assert hour.hydro_water_consumption_l is None
        assert hour.renewable_to_load_mw <= hour.required_load_mw + 1e-5
        assert hour.it_power_mw <= hour.required_load_mw + 1e-5


def test_unserved_work_never_appears_as_carbon_savings() -> None:
    request = CouplingRequest(sample_count=32, supply=grid_only_portfolio())
    request.grid.import_limit_mw = 0
    result = run_coupling(request)
    assert not result.comparison.comparable
    assert result.proposed.summary.unserved_energy_mwh.p50 > 0
    assert result.proposed.summary.served_energy_mwh.p50 == 0
    assert result.proposed.summary.operational_carbon_t.p50 == 0
    assert result.comparison.carbon_change_pct_p50 is None
    assert result.comparison.variable_cost_change_pct_p50 is None
    assert result.proposed.summary.cooling_water_consumption_l.p50 > 0
    assert "not equivalent computing service" in result.comparison.explanation


def test_flexible_hot_dry_reservoir_case_preserves_work() -> None:
    request = CouplingRequest(sample_count=32, weather_case="hot-dry")
    request.flexibility.fraction = 0.3
    request.supply.hydro_mode = "reservoir-budget"
    request.supply.hydro_water_consumption_l_per_kwh = 1.2
    request.cooling_water.heat_rejection = "evaporative"
    result = run_coupling(request)
    proposed, baseline = result.proposed.summary, result.baseline.summary
    assert (
        proposed.requested_compute_mwh_equivalent
        == baseline.requested_compute_mwh_equivalent
    )
    assert proposed.shifted_compute_mwh_equivalent.p50 > 0
    assert proposed.hydro_water_consumption_l is not None
    assert proposed.hydro_water_consumption_l.p50 == pytest.approx(
        proposed.hydro_generation_mwh.p50 * 1200, abs=0.002
    )
    assert proposed.cooling_water_withdrawal_l.p50 == pytest.approx(
        proposed.cooling_water_consumption_l.p50 * 1.25, abs=0.002
    )
    assert any("heuristic" in warning for warning in result.warnings)


def test_multiyear_calendar_and_trace_period() -> None:
    request = CouplingRequest(sample_count=32)
    request.demand.start_date = date(2028, 2, 1)
    request.demand.horizon_years = 2
    request.trace_month = 13
    request.cooling_water.heat_rejection = "dry"
    result = run_coupling(request)
    assert len(result.proposed.periods) == 24
    assert result.proposed.periods[0].period == "2028-02"
    assert result.hourly_trace[0].timestamp.startswith("2029-02-01")
    assert result.proposed.summary.cooling_water_consumption_l.p50 == 0
    assert result.comparison.cooling_water_change_pct_p50 is None


@pytest.mark.parametrize(
    "payload",
    [
        {"supply": {"battery_power_mw": 0}},
        {"supply": {"battery_energy_mwh": 0}},
        {"supply": {"solar_mw": -1}},
        {"supply": {"hydro_capacity_factor": 1.5}},
        {"flexibility": {"fraction": 0.8}},
        {"trace_month": 13},
        {"unexpected_telemetry": []},
    ],
)
def test_invalid_or_undeclared_assumptions_are_rejected(payload: dict) -> None:
    with pytest.raises(ValidationError):
        CouplingRequest.model_validate(payload)


def test_coupling_api_exposes_real_results_and_validation() -> None:
    client = TestClient(app)
    example = client.get("/coupling/example")
    assert example.status_code == 200
    payload = example.json()
    payload["sample_count"] = 32
    response = client.post("/coupling/evaluate", json=payload)
    assert response.status_code == 200
    assert response.json()["provenance"]["calibration_status"] == "uncalibrated"
    assert len(response.json()["hourly_trace"]) == 168
    payload["supply"]["solar_mw"] = -1
    assert client.post("/coupling/evaluate", json=payload).status_code == 422


@pytest.mark.anyio
async def test_coupling_shares_the_existing_forecast_run_limit() -> None:
    await FORECAST_LOCK.acquire()
    try:
        with pytest.raises(HTTPException) as error:
            await post_coupling(CouplingRequest())
        assert error.value.status_code == 429
    finally:
        FORECAST_LOCK.release()
