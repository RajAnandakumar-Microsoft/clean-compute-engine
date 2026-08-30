# Contributing

The Clean Compute Engine is a public, pre-calibration research
project. Contributions should improve the scientific question, evidence,
governance, reproducibility, or demonstrator without overstating what the model
can do.

By participating, you acknowledge the project's
[independence and non-endorsement statement](DISCLAIMER.md).

## Before contributing

Read:

1. [Research contract](research/RESEARCH-CONTRACT.md)
2. [Evaluation protocol](research/EVALUATION-PROTOCOL.md)
3. [Data governance and responsible release](research/GOVERNANCE-AND-RELEASE.md)
4. [Forecast model card](FORECAST-MODEL-CARD.md)

The existing v0.1 outputs are synthetic scenario results, not validated
predictions.

## Data safety

Never commit:

- data-partner or third-party restricted telemetry;
- customer, tenant, employee, or user content or identifiers;
- exact facility locations or security-sensitive topology;
- internal endpoints, system identifiers, network addresses, or credentials;
- row-level derivatives of restricted data;
- site-specific parameters, embeddings, checkpoints, or logs; or
- material without clear repository-use and redistribution rights.

Do not paste restricted data into prompts, issues, pull requests, test output,
or screenshots. If restricted material is committed accidentally, stop work and
privately notify the repository owner. Do not copy, move, or further expose it.

## Research contributions

Any new dataset must include:

- a validated dataset manifest;
- version and content hash;
- units and meter/system boundaries;
- license or data-use agreement;
- permitted and prohibited uses;
- privacy and location reductions;
- research role and split assignment; and
- known limitations.

Any empirical result must identify:

- the experiment manifest;
- immutable code revision;
- dataset manifests;
- frozen splits and baselines;
- point and uncertainty metrics;
- subgroup failures;
- applicability bounds; and
- claim and release approval.

Negative results are valid contributions. Do not tune against a held-out test
set or replace a preregistered metric after seeing the result.

## Software workflow

1. Create a focused branch.
2. Keep changes narrow and preserve the working demonstrator.
3. Add or update tests for changed behavior.
4. Run the backend checks:

   ```powershell
   cd backend
   .\.venv\Scripts\python.exe -m ruff check app tests
   .\.venv\Scripts\python.exe -m pytest --cov --cov-config=.coveragerc
   ```

5. For frontend changes, also run:

   ```powershell
   cd frontend
   npm run build
   ```

6. Complete the pull-request checklist and request review.

Generated schemas under `data/schemas/` must remain synchronized with
`backend/app/research/contracts.py`.

## Licensing

The project is licensed under the Apache License 2.0. By contributing, you
represent that you have the right to submit the work under that license and
that doing so does not violate employment, confidentiality, data-use, or
third-party obligations.
