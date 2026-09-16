# Research data boundary

This directory contains schemas and explicitly synthetic examples. It contains
**no non-public operational telemetry, customer data, or observed facility
records from any organization**.

## Layout

```text
data/
  schemas/      Generated JSON Schemas for governed research inputs
  synthetic/    Hand-authored records used only for contract and software tests
```

The Pydantic source of truth is `backend/app/research/contracts.py`. Regenerate
the committed JSON Schemas from the repository root with:

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.research.export_schemas
```

## Rules

- Restricted telemetry must remain in its approved data-partner-controlled
  environment.
- Do not add raw, prepared, sampled, or derived restricted records to Git.
- Do not add exact facility locations, customer content, tenant identifiers,
  internal system identifiers, or free text.
- Every research dataset requires a validated dataset manifest.
- Every manifest must identify system boundaries, research roles, and a content
  hash with a precise hash scope.
- Public data requires a version, content hash, license review, attribution,
  and explicit redistribution permission before it is committed.
- Synthetic data must use `site-demo-*` identifiers and must not be fitted to,
  or presented as, a real facility.
- Experiment outputs enter Git only after their release boundary is reviewed.

See
[data governance and responsible release](../research/GOVERNANCE-AND-RELEASE.md)
for the complete policy.

## Contract design

The interface deliberately standardizes:

- interval energy rather than ambiguous instantaneous readings;
- deidentified site IDs;
- coarse climate, grid, capacity, cooling, and hardware context;
- installed, available, allocated, and active accelerator-hours;
- separate cooling-loop and heat-rejection classifications;
- separate water withdrawal and consumption;
- explicit grid-emissions basis;
- operating-state and quality flags; and
- dataset permissions and claim boundaries.

Unknown fields are rejected. This prevents accidental passthrough of customer
or facility-sensitive columns into the research pipeline.

## Coverage of the two pilot workstreams

These contracts cover facility intervals, site metadata, and dataset/experiment
manifests. The [pilot's supply and operating-constraint workstream](../research/DATA-PILOT-PROPOSAL.md)
also needs generation, storage, connection, tariff, and scheduling evidence.
Those feeds do not yet have a complete versioned research-ingestion schema
in this directory.

The energy evaluator's request models are synthetic scenario configuration,
not an ingestion contract for private telemetry. New feed contracts require
field qualification and owner/governance review before data is ingested.
Do not bypass the strict existing schemas to fit an unreviewed dataset.
