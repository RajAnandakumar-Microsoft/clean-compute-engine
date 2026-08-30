# Experiments

This directory is the entry point for reproducible model experiments. The
current repository contains only a synthetic contract smoke test; it contains
no empirical accuracy result.

## Required workflow

1. Create and validate dataset manifests.
2. Complete the data-quality gate.
3. Freeze hypotheses, splits, baselines, metrics, and thresholds.
4. Add an experiment manifest under `manifests/`.
5. Run from an immutable code revision and versioned environment.
6. Write machine-readable metrics to the approved output location.
7. Review claim, privacy, security, and release boundaries.
8. Commit only artifacts approved for this repository.

Restricted experiment outputs must use an internal approved location rather
than a path in this repository.

See [the evaluation protocol](../research/EVALUATION-PROTOCOL.md) for the
scientific requirements.

## Planned artifact structure

```text
experiments/
  manifests/          Frozen experiment definitions safe for this repository
  results-public/     Release-approved aggregate metrics only
```

Each result must be traceable to an experiment manifest, dataset manifest,
code revision, configuration, and random seed.
