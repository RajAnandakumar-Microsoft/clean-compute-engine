"""Strict contracts for governed research data and experiments."""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator

SchemaVersion = Literal["0.1.0"]
IntervalMinutes = Literal[5, 10, 15, 30, 60]
DataClassification = Literal[
    "synthetic",
    "public",
    "restricted-internal",
    "confidential-third-party",
]
CoolingLoop = Literal[
    "air",
    "direct-to-chip",
    "immersion",
    "hybrid",
    "unknown",
]
HeatRejection = Literal[
    "air-cooled",
    "dry-cooler",
    "evaporative-tower",
    "hybrid",
    "unknown",
]
WorkloadClass = Literal[
    "training",
    "real-time-inference",
    "batch-inference",
    "development",
    "mixed",
    "unknown",
]
GridEmissionsBasis = Literal[
    "location-average",
    "location-marginal",
    "market-based",
    "unknown",
]
OperatingState = Literal[
    "normal",
    "maintenance",
    "outage",
    "curtailed",
    "unknown",
]
QualityFlag = Literal[
    "synthetic-example",
    "missing-source",
    "imputed",
    "sensor-reset",
    "sensor-clipped",
    "sensor-drift",
    "time-gap",
    "unit-converted",
    "boundary-unresolved",
    "weather-join-missing",
    "grid-join-missing",
    "maintenance-affected",
    "outage-affected",
    "manual-review",
]
PermittedUse = Literal[
    "software-testing",
    "demonstration",
    "method-development",
    "calibration",
    "training",
    "validation",
    "publication",
]
ResearchRole = Literal[
    "method-development",
    "calibration",
    "validation",
    "test",
    "context-only",
    "not-applicable",
]
SplitStrategy = Literal[
    "rolling-origin",
    "leave-one-site-out",
    "site-and-time-holdout",
    "regime-holdout",
    "not-applicable",
]

DATASET_ID_PATTERN = r"^[a-z0-9][a-z0-9._-]{2,79}$"
SITE_ID_PATTERN = r"^site-[a-z0-9][a-z0-9-]{2,58}$"
EXPERIMENT_ID_PATTERN = r"^exp-[a-z0-9][a-z0-9-]{2,75}$"
SHA256_PATTERN = r"^[a-f0-9]{64}$"


class ContractModel(BaseModel):
    """Base class that rejects undeclared research fields."""

    model_config = ConfigDict(extra="forbid")


class SiteMetadata(ContractModel):
    """Deidentified facility context safe for the governed research interface."""

    record_type: Literal["site-metadata"] = "site-metadata"
    schema_version: SchemaVersion = "0.1.0"
    site_id: str = Field(pattern=SITE_ID_PATTERN)
    country_code: str = Field("US", pattern=r"^[A-Z]{2}$")
    climate_zone: str = Field(min_length=1, max_length=80)
    grid_region: str = Field(min_length=1, max_length=80)
    capacity_bucket_mw: Literal["<10", "10-49", "50-99", "100-249", "250+"]
    cooling_loop: CoolingLoop
    heat_rejection: HeatRejection
    water_source_class: Literal[
        "potable",
        "reclaimed",
        "surface",
        "groundwater",
        "mixed",
        "none",
        "unknown",
    ] = "unknown"
    hardware_generation_bucket: str = Field(min_length=1, max_length=80)
    valid_from: date


class TelemetryInterval(ContractModel):
    """One normalized, deidentified telemetry interval."""

    record_type: Literal["telemetry-interval"] = "telemetry-interval"
    schema_version: SchemaVersion = "0.1.0"
    dataset_id: str = Field(pattern=DATASET_ID_PATTERN)
    site_id: str = Field(pattern=SITE_ID_PATTERN)
    interval_start: AwareDatetime
    interval_minutes: IntervalMinutes
    total_facility_energy_kwh: float = Field(ge=0.0)
    it_energy_kwh: float = Field(ge=0.0)
    cooling_energy_kwh: float | None = Field(None, ge=0.0)
    ups_distribution_energy_kwh: float | None = Field(None, ge=0.0)
    peak_facility_power_kw: float | None = Field(None, ge=0.0)
    installed_it_capacity_kw: float | None = Field(None, ge=0.0)
    available_it_capacity_kw: float | None = Field(None, ge=0.0)
    installed_accelerator_hours: float | None = Field(None, ge=0.0)
    available_accelerator_hours: float | None = Field(None, ge=0.0)
    allocated_accelerator_hours: float | None = Field(None, ge=0.0)
    active_accelerator_hours: float | None = Field(None, ge=0.0)
    workload_class: WorkloadClass = "unknown"
    dry_bulb_c: float | None = Field(None, ge=-80.0, le=70.0)
    wet_bulb_c: float | None = Field(None, ge=-80.0, le=50.0)
    relative_humidity_pct: float | None = Field(None, ge=0.0, le=100.0)
    water_withdrawal_l: float | None = Field(None, ge=0.0)
    water_consumption_l: float | None = Field(None, ge=0.0)
    grid_carbon_gco2e_per_kwh: float | None = Field(None, ge=0.0, le=2_000.0)
    grid_emissions_basis: GridEmissionsBasis = "unknown"
    operating_state: OperatingState = "normal"
    quality_flags: list[QualityFlag] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def validate_physical_relationships(self) -> TelemetryInterval:
        """Reject records that violate essential interval relationships."""
        energy_tolerance = max(0.01, self.total_facility_energy_kwh * 0.001)
        if self.it_energy_kwh > self.total_facility_energy_kwh + energy_tolerance:
            raise ValueError("it_energy_kwh cannot exceed total_facility_energy_kwh")
        component_energy = self.it_energy_kwh + sum(
            value
            for value in (
                self.cooling_energy_kwh,
                self.ups_distribution_energy_kwh,
            )
            if value is not None
        )
        component_tolerance = max(0.1, self.total_facility_energy_kwh * 0.02)
        if component_energy > self.total_facility_energy_kwh + component_tolerance:
            raise ValueError(
                "metered component energy cannot exceed total facility energy"
            )
        if self.peak_facility_power_kw is not None:
            interval_hours = self.interval_minutes / 60.0
            average_power_kw = self.total_facility_energy_kwh / interval_hours
            if self.peak_facility_power_kw + 1e-6 < average_power_kw:
                raise ValueError(
                    "peak_facility_power_kw cannot be below interval average power"
                )
        if (
            self.available_it_capacity_kw is not None
            and self.installed_it_capacity_kw is None
        ):
            raise ValueError(
                "installed_it_capacity_kw is required when available capacity is set"
            )
        if (
            self.available_it_capacity_kw is not None
            and self.installed_it_capacity_kw is not None
            and self.available_it_capacity_kw > self.installed_it_capacity_kw + 1e-6
        ):
            raise ValueError(
                "available_it_capacity_kw cannot exceed installed capacity"
            )
        if (
            self.available_accelerator_hours is not None
            and self.installed_accelerator_hours is None
        ):
            raise ValueError(
                "installed_accelerator_hours is required when available hours are set"
            )
        if (
            self.available_accelerator_hours is not None
            and self.installed_accelerator_hours is not None
            and self.available_accelerator_hours
            > self.installed_accelerator_hours + 1e-6
        ):
            raise ValueError(
                "available_accelerator_hours cannot exceed installed hours"
            )
        if (
            self.allocated_accelerator_hours is not None
            and self.available_accelerator_hours is None
        ):
            raise ValueError(
                "available_accelerator_hours is required when allocated hours are set"
            )
        if (
            self.allocated_accelerator_hours is not None
            and self.available_accelerator_hours is not None
            and self.allocated_accelerator_hours
            > self.available_accelerator_hours + 1e-6
        ):
            raise ValueError(
                "allocated_accelerator_hours cannot exceed available hours"
            )
        if (
            self.active_accelerator_hours is not None
            and self.allocated_accelerator_hours is None
        ):
            raise ValueError(
                "allocated_accelerator_hours is required when active hours are set"
            )
        if (
            self.active_accelerator_hours is not None
            and self.allocated_accelerator_hours is not None
            and self.active_accelerator_hours > self.allocated_accelerator_hours + 1e-6
        ):
            raise ValueError("active_accelerator_hours cannot exceed allocated hours")
        if (
            self.dry_bulb_c is not None
            and self.wet_bulb_c is not None
            and self.wet_bulb_c > self.dry_bulb_c + 0.5
        ):
            raise ValueError("wet_bulb_c cannot materially exceed dry_bulb_c")
        return self


class DatasetManifest(ContractModel):
    """Provenance, permission, and claim boundary for one dataset version."""

    record_type: Literal["dataset-manifest"] = "dataset-manifest"
    schema_version: SchemaVersion = "0.1.0"
    dataset_id: str = Field(pattern=DATASET_ID_PATTERN)
    version: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=160)
    classification: DataClassification
    owner: str = Field(min_length=1, max_length=160)
    created_at: AwareDatetime
    coverage_start: date
    coverage_end: date
    interval_minutes: IntervalMinutes
    site_count: int = Field(ge=1)
    record_count: int = Field(ge=1)
    source_systems: list[str] = Field(min_length=1, max_length=20)
    schema_versions: list[SchemaVersion] = Field(min_length=1)
    permitted_uses: list[PermittedUse] = Field(min_length=1)
    research_roles: list[ResearchRole] = Field(min_length=1)
    prohibited_uses: list[str] = Field(min_length=1)
    contains_customer_content: Literal[False] = False
    contains_employee_identifiers: Literal[False] = False
    contains_network_identifiers: Literal[False] = False
    contains_free_text: Literal[False] = False
    contains_precise_facility_location: Literal[False] = False
    location_resolution: Literal[
        "none",
        "country",
        "region",
        "climate-and-grid",
    ]
    license_or_data_use_agreement: str = Field(min_length=1, max_length=500)
    system_boundaries: list[str] = Field(min_length=1, max_length=30)
    governance_approval_reference: str | None = Field(
        None,
        min_length=1,
        max_length=160,
    )
    retention_end: date | None = None
    content_sha256: str = Field(pattern=SHA256_PATTERN)
    content_hash_scope: str = Field(min_length=1, max_length=500)
    transformations: list[str] = Field(default_factory=list, max_length=50)
    known_limitations: list[str] = Field(min_length=1, max_length=50)
    claim_boundary: str = Field(min_length=1, max_length=1_000)

    @model_validator(mode="after")
    def validate_governance(self) -> DatasetManifest:
        """Require dates and approvals appropriate to the classification."""
        if self.coverage_end < self.coverage_start:
            raise ValueError("coverage_end must be on or after coverage_start")
        if self.classification in {
            "restricted-internal",
            "confidential-third-party",
        }:
            if self.governance_approval_reference is None:
                raise ValueError("restricted data requires a governance approval")
            if self.retention_end is None:
                raise ValueError("restricted data requires a retention_end date")
        return self


class ExperimentManifest(ContractModel):
    """Frozen plan and claim boundary for one reproducible experiment."""

    record_type: Literal["experiment-manifest"] = "experiment-manifest"
    schema_version: SchemaVersion = "0.1.0"
    experiment_id: str = Field(pattern=EXPERIMENT_ID_PATTERN)
    title: str = Field(min_length=1, max_length=160)
    status: Literal["planned", "running", "completed", "failed", "stopped"]
    purpose: str = Field(min_length=1, max_length=1_000)
    hypothesis_ids: list[str] = Field(default_factory=list, max_length=20)
    code_revision: str = Field(min_length=7, max_length=80)
    dataset_manifest_ids: list[str] = Field(min_length=1, max_length=20)
    split_strategy: SplitStrategy
    random_seed: int = Field(ge=0, le=2_147_483_647)
    candidate_models: list[str] = Field(min_length=1, max_length=20)
    baselines: list[str] = Field(min_length=1, max_length=20)
    metrics: list[str] = Field(min_length=1, max_length=40)
    claim_boundary: str = Field(min_length=1, max_length=1_000)
    output_location: str = Field(min_length=1, max_length=240)
