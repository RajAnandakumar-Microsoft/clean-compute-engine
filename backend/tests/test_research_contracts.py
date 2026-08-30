"""Tests for the governed research-data boundary."""

from __future__ import annotations

import json
from hashlib import sha256
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.research.contracts import (
    DatasetManifest,
    ExperimentManifest,
    SiteMetadata,
    TelemetryInterval,
)
from app.research.export_schemas import SCHEMA_MODELS

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
SYNTHETIC_DATA = REPOSITORY_ROOT / "data" / "synthetic"


def test_committed_synthetic_examples_match_contracts() -> None:
    site_payload = json.loads(
        (SYNTHETIC_DATA / "site-metadata.json").read_text(encoding="utf-8")
    )
    manifest_payload = json.loads(
        (SYNTHETIC_DATA / "dataset-manifest.json").read_text(encoding="utf-8")
    )
    experiment_payload = json.loads(
        (
            REPOSITORY_ROOT / "experiments" / "manifests" / "v0.1-synthetic-smoke.json"
        ).read_text(encoding="utf-8")
    )

    site = SiteMetadata.model_validate(site_payload)
    manifest = DatasetManifest.model_validate(manifest_payload)
    experiment = ExperimentManifest.model_validate(experiment_payload)
    telemetry = [
        TelemetryInterval.model_validate_json(line)
        for line in (SYNTHETIC_DATA / "telemetry-intervals.jsonl")
        .read_text(encoding="utf-8")
        .splitlines()
        if line.strip()
    ]

    assert site.site_id == "site-demo-001"
    assert manifest.classification == "synthetic"
    assert experiment.status == "completed"
    assert len(telemetry) == manifest.record_count
    assert {record.site_id for record in telemetry} == {site.site_id}
    telemetry_bytes = (
        (SYNTHETIC_DATA / "telemetry-intervals.jsonl")
        .read_bytes()
        .replace(b"\r\n", b"\n")
    )
    assert sha256(telemetry_bytes).hexdigest() == manifest.content_sha256


def test_telemetry_rejects_invalid_energy_and_capacity_relationships() -> None:
    valid = {
        "dataset_id": "cce-synthetic-example",
        "site_id": "site-demo-001",
        "interval_start": "2027-01-01T00:00:00Z",
        "interval_minutes": 60,
        "total_facility_energy_kwh": 1_000.0,
        "it_energy_kwh": 800.0,
        "installed_accelerator_hours": 600.0,
        "available_accelerator_hours": 500.0,
        "allocated_accelerator_hours": 400.0,
        "active_accelerator_hours": 300.0,
    }

    with pytest.raises(ValidationError, match="it_energy_kwh"):
        TelemetryInterval.model_validate({**valid, "it_energy_kwh": 1_100.0})

    with pytest.raises(ValidationError, match="active_accelerator_hours"):
        TelemetryInterval.model_validate({**valid, "active_accelerator_hours": 450.0})

    with pytest.raises(ValidationError, match="available_accelerator_hours"):
        TelemetryInterval.model_validate(
            {**valid, "available_accelerator_hours": 700.0}
        )


def test_contract_rejects_undeclared_sensitive_fields() -> None:
    with pytest.raises(ValidationError, match="customer_tenant_id"):
        TelemetryInterval.model_validate(
            {
                "dataset_id": "cce-synthetic-example",
                "site_id": "site-demo-001",
                "interval_start": "2027-01-01T00:00:00Z",
                "interval_minutes": 60,
                "total_facility_energy_kwh": 1_000.0,
                "it_energy_kwh": 800.0,
                "customer_tenant_id": "must-not-be-present",
            }
        )


def test_contract_rejects_free_text_quality_flags() -> None:
    with pytest.raises(ValidationError, match="quality_flags"):
        TelemetryInterval.model_validate(
            {
                "dataset_id": "cce-synthetic-example",
                "site_id": "site-demo-001",
                "interval_start": "2027-01-01T00:00:00Z",
                "interval_minutes": 60,
                "total_facility_energy_kwh": 1_000.0,
                "it_energy_kwh": 800.0,
                "quality_flags": ["operator note naming a facility"],
            }
        )


def test_contract_rejects_impossible_peak_and_component_energy() -> None:
    base = {
        "dataset_id": "cce-synthetic-example",
        "site_id": "site-demo-001",
        "interval_start": "2027-01-01T00:00:00Z",
        "interval_minutes": 60,
        "total_facility_energy_kwh": 1_000.0,
        "it_energy_kwh": 800.0,
    }

    with pytest.raises(ValidationError, match="peak_facility_power_kw"):
        TelemetryInterval.model_validate({**base, "peak_facility_power_kw": 900.0})

    with pytest.raises(ValidationError, match="component energy"):
        TelemetryInterval.model_validate(
            {
                **base,
                "cooling_energy_kwh": 250.0,
                "ups_distribution_energy_kwh": 50.0,
            }
        )


def test_restricted_manifest_requires_approval_and_retention() -> None:
    payload = json.loads(
        (SYNTHETIC_DATA / "dataset-manifest.json").read_text(encoding="utf-8")
    )
    payload["classification"] = "restricted-internal"
    payload["governance_approval_reference"] = None
    payload["retention_end"] = None

    with pytest.raises(ValidationError, match="governance approval"):
        DatasetManifest.model_validate(payload)


def test_committed_json_schemas_match_pydantic_contracts() -> None:
    schema_directory = REPOSITORY_ROOT / "data" / "schemas"
    for file_name, model in SCHEMA_MODELS.items():
        committed = json.loads(
            (schema_directory / file_name).read_text(encoding="utf-8")
        )
        assert committed == model.model_json_schema()
