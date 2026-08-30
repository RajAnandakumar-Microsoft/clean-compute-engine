"""Generate compact deterministic outcomes for the static voxel story."""

from __future__ import annotations

import argparse
import logging
from datetime import date
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from app.forecast.assumptions import example_request, forecast_metadata
from app.forecast.engine import run_forecast
from app.forecast.models import (
    ForecastResult,
    ForecastRunRequest,
    HorizonSummary,
    QuantileValues,
    WorkloadMix,
)

WorkloadChoice = Literal["balanced", "inference", "training"]
CoolingChoice = Literal["air", "liquid"]

CATALOG_SCHEMA_VERSION = "1.0"
STORY_SEED = 73
STORY_SAMPLE_COUNT = 96
STORY_START_YEAR = 2027
STORY_HORIZONS = tuple(range(1, 11))
STORY_WORKLOADS: tuple[WorkloadChoice, ...] = (
    "balanced",
    "inference",
    "training",
)
STORY_COOLING: tuple[CoolingChoice, ...] = ("liquid", "air")

WORKLOAD_MIXES: dict[WorkloadChoice, WorkloadMix] = {
    "balanced": WorkloadMix(
        training=0.30,
        real_time_inference=0.45,
        batch_inference=0.15,
        development=0.10,
    ),
    "inference": WorkloadMix(
        training=0.10,
        real_time_inference=0.70,
        batch_inference=0.15,
        development=0.05,
    ),
    "training": WorkloadMix(
        training=0.70,
        real_time_inference=0.10,
        batch_inference=0.15,
        development=0.05,
    ),
}


class StoryHorizon(BaseModel):
    """Forecast fields rendered by the voxel story."""

    years: int
    cumulative_facility_energy_mwh: QuantileValues
    cumulative_operational_carbon_t: QuantileValues
    average_pue: QuantileValues


class StoryDelta(BaseModel):
    """Paired P50 differences rendered by the comparison chapter."""

    facility_energy_pct_p50: float
    operational_carbon_pct_p50: float


class StoryOutcome(BaseModel):
    """One workload, cooling, and horizon outcome."""

    scenario: StoryHorizon
    baseline: StoryHorizon
    delta: StoryDelta


class StoryOutcomeCatalog(BaseModel):
    """Versioned static outcome catalog consumed by GitHub Pages."""

    schema_version: Literal["1.0"]
    model_version: str
    assumption_set_version: str
    calibration_status: Literal["uncalibrated"]
    seed: int
    sample_count: int
    disclaimer: str
    outcomes: dict[str, StoryOutcome]


def catalog_path() -> Path:
    """Return the repository path for the generated story catalog."""
    repository_root = Path(__file__).resolve().parents[3]
    return repository_root / "frontend" / "public" / "story-data" / "outcomes.json"


def outcome_key(
    workload: WorkloadChoice,
    cooling: CoolingChoice,
    horizon_years: int,
) -> str:
    """Build the stable lookup key shared with the browser."""
    return f"{workload}:{cooling}:{horizon_years}"


def build_story_request(
    workload: WorkloadChoice,
    cooling: CoolingChoice,
    horizon_years: int,
    *,
    sample_count: int = STORY_SAMPLE_COUNT,
) -> ForecastRunRequest:
    """Translate one story decision set into a validated forecast request."""
    template = example_request()
    scenario = template.scenario.model_copy(deep=True)
    if not scenario.phases:
        raise ValueError("The forecast template must include a capacity phase.")

    mature_utilization = 0.72 if workload == "training" else 0.64
    phase_one_template = scenario.phases[0]
    phase_two_template = (
        scenario.phases[1] if len(scenario.phases) > 1 else phase_one_template
    )
    phase_one = phase_one_template.model_copy(
        update={
            "name": "Phase 1",
            "start_date": date(STORY_START_YEAR, 1, 1),
            "it_capacity_mw": 20,
            "mature_utilization": mature_utilization,
        }
    )
    phase_two = phase_two_template.model_copy(
        update={
            "name": "Phase 2",
            "start_date": date(2029, 1, 1),
            "it_capacity_mw": 30,
            "mature_utilization": mature_utilization,
        }
    )
    scenario = scenario.model_copy(
        update={
            "name": "Virginia AI campus",
            "location": "va-loudoun",
            "start_date": date(STORY_START_YEAR, 1, 1),
            "horizon_years": horizon_years,
            "workload_mix": WORKLOAD_MIXES[workload].model_copy(deep=True),
            "facility": scenario.facility.model_copy(
                update={
                    "cooling": cooling,
                    "design_pue": 1.20 if cooling == "liquid" else 1.38,
                }
            ),
            "phases": [phase_one, phase_two],
        }
    )

    if template.baseline is None:
        raise ValueError("The forecast template must include a baseline.")
    baseline = template.baseline.model_copy(
        deep=True,
        update={
            "name": "Conventional baseline",
            "location": scenario.location,
            "start_date": scenario.start_date,
            "horizon_years": horizon_years,
            "workload_mix": scenario.workload_mix.model_copy(deep=True),
            "phases": [
                phase.model_copy(update={"refresh_efficiency_gain": 0.04})
                for phase in scenario.phases
            ],
            "facility": template.baseline.facility.model_copy(
                update={"cooling": "air", "design_pue": 1.45}
            ),
        },
    )
    request = ForecastRunRequest(
        scenario=scenario,
        baseline=baseline,
        seed=STORY_SEED,
        sample_count=sample_count,
    )
    return ForecastRunRequest.model_validate(request.model_dump())


def _compact_horizon(horizon: HorizonSummary) -> StoryHorizon:
    return StoryHorizon(
        years=horizon.years,
        cumulative_facility_energy_mwh=horizon.cumulative_facility_energy_mwh,
        cumulative_operational_carbon_t=horizon.cumulative_operational_carbon_t,
        average_pue=horizon.average_pue,
    )


def compact_story_result(result: ForecastResult) -> StoryOutcome:
    """Reduce a full forecast response to the fields rendered by the story."""
    if result.baseline is None or not result.baseline.horizons:
        raise ValueError("The story forecast result must include a baseline horizon.")
    if not result.scenario.horizons or not result.deltas:
        raise ValueError("The story forecast result is missing its requested horizon.")
    return StoryOutcome(
        scenario=_compact_horizon(result.scenario.horizons[-1]),
        baseline=_compact_horizon(result.baseline.horizons[-1]),
        delta=StoryDelta(
            facility_energy_pct_p50=result.deltas[-1].facility_energy_pct_p50,
            operational_carbon_pct_p50=(result.deltas[-1].operational_carbon_pct_p50),
        ),
    )


def build_catalog(
    *,
    workloads: tuple[WorkloadChoice, ...] = STORY_WORKLOADS,
    cooling_choices: tuple[CoolingChoice, ...] = STORY_COOLING,
    horizons: tuple[int, ...] = STORY_HORIZONS,
    sample_count: int = STORY_SAMPLE_COUNT,
) -> StoryOutcomeCatalog:
    """Run the deterministic forecast matrix used by the static story."""
    outcomes: dict[str, StoryOutcome] = {}
    for workload in workloads:
        for cooling in cooling_choices:
            for horizon_years in horizons:
                request = build_story_request(
                    workload,
                    cooling,
                    horizon_years,
                    sample_count=sample_count,
                )
                outcomes[outcome_key(workload, cooling, horizon_years)] = (
                    compact_story_result(run_forecast(request))
                )

    metadata = forecast_metadata()
    return StoryOutcomeCatalog(
        schema_version=CATALOG_SCHEMA_VERSION,
        model_version=metadata.model_version,
        assumption_set_version=metadata.assumption_set_version,
        calibration_status=metadata.calibration_status,
        seed=STORY_SEED,
        sample_count=sample_count,
        disclaimer=metadata.disclaimer,
        outcomes=outcomes,
    )


def export_catalog(output_path: Path | None = None) -> Path:
    """Generate and write the complete static story catalog."""
    destination = output_path or catalog_path()
    catalog = build_catalog()
    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            catalog.model_dump_json(indent=2) + "\n",
            encoding="utf-8",
        )
    except OSError as error:
        raise RuntimeError(f"Could not write story catalog to {destination}") from error
    return destination


def validate_catalog(input_path: Path | None = None) -> StoryOutcomeCatalog:
    """Validate catalog metadata, coverage, and Pydantic structure."""
    source = input_path or catalog_path()
    try:
        catalog = StoryOutcomeCatalog.model_validate_json(
            source.read_text(encoding="utf-8")
        )
    except OSError as error:
        raise RuntimeError(f"Could not read story catalog from {source}") from error

    metadata = forecast_metadata()
    expected_keys = {
        outcome_key(workload, cooling, horizon)
        for workload in STORY_WORKLOADS
        for cooling in STORY_COOLING
        for horizon in STORY_HORIZONS
    }
    if set(catalog.outcomes) != expected_keys:
        raise ValueError("Story catalog does not cover the complete decision matrix.")
    if catalog.model_version != metadata.model_version:
        raise ValueError("Story catalog model version is stale.")
    if catalog.assumption_set_version != metadata.assumption_set_version:
        raise ValueError("Story catalog assumption set is stale.")
    if catalog.seed != STORY_SEED or catalog.sample_count != STORY_SAMPLE_COUNT:
        raise ValueError("Story catalog simulation controls are stale.")
    for key, outcome in catalog.outcomes.items():
        expected_horizon = int(key.rsplit(":", maxsplit=1)[-1])
        if outcome.scenario.years != expected_horizon:
            raise ValueError(f"Story catalog horizon mismatch for {key}.")
    return catalog


def main() -> None:
    """Generate or validate the static story catalog."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate the committed catalog without regenerating forecasts.",
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    if args.check:
        catalog = validate_catalog()
        logging.info("Validated %s static story outcomes.", len(catalog.outcomes))
        return
    destination = export_catalog()
    logging.info("Wrote static story outcomes to %s.", destination)


if __name__ == "__main__":
    main()
