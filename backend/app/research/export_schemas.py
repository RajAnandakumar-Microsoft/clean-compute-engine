"""Export committed JSON Schemas from the Pydantic research contracts."""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel

from app.research.contracts import (
    DatasetManifest,
    ExperimentManifest,
    SiteMetadata,
    TelemetryInterval,
)

SCHEMA_MODELS: dict[str, type[BaseModel]] = {
    "dataset-manifest.schema.json": DatasetManifest,
    "experiment-manifest.schema.json": ExperimentManifest,
    "site-metadata.schema.json": SiteMetadata,
    "telemetry-interval.schema.json": TelemetryInterval,
}


def export_schemas(output_dir: Path) -> list[Path]:
    """Write deterministic JSON Schemas to the repository data directory."""
    output_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for file_name, model in SCHEMA_MODELS.items():
        target = output_dir / file_name
        content = json.dumps(model.model_json_schema(), indent=2, sort_keys=True)
        target.write_text(f"{content}\n", encoding="utf-8")
        written.append(target)
    return written


def main() -> None:
    """Export schemas to the fixed repository location."""
    repository_root = Path(__file__).resolve().parents[3]
    export_schemas(repository_root / "data" / "schemas")


if __name__ == "__main__":
    main()
