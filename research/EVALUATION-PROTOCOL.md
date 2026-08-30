# Evaluation protocol

This protocol defines how future calibrated versions of the Clean Compute
Engine will be evaluated. It prevents convenient data splits or metrics from
turning a prototype into an unsupported accuracy claim.

## 1. Preregistration and dataset freeze

Before fitting begins, an experiment must freeze:

- hypothesis IDs from [the research contract](RESEARCH-CONTRACT.md);
- dataset manifest versions and content hashes;
- inclusion and exclusion rules;
- meter-boundary reconciliation rules;
- train, calibration, validation, and test partitions;
- baseline implementations;
- candidate model configuration;
- metrics and provisional success thresholds; and
- subgroup and ablation analyses.

The held-out test set must remain unavailable to iterative feature and
hyperparameter decisions. Any post-test change creates a new experiment and a
new test boundary.

## 2. Data-quality gate

No accuracy experiment proceeds until the dataset audit reports:

- timestamp normalization and daylight-saving handling;
- interval completeness and duplicate rate;
- unit conversions;
- energy-meter boundary definitions;
- IT-to-facility energy reconciliation;
- installed and available capacity denominators;
- sensor resets, clipping, drift, and imputation;
- cooling and heat-rejection taxonomy coverage;
- weather and grid join coverage;
- maintenance, outage, and curtailment treatment; and
- missingness by facility and operating regime.

Imputed target values cannot be treated as observed truth. Rows with unresolved
boundary or unit errors must be excluded by a recorded rule rather than by
manual result inspection.

## 3. Evaluation splits

Random row-level splitting is prohibited as the primary evaluation because
adjacent telemetry intervals are strongly correlated.

Required split families:

1. **Rolling-origin time holdout** - train on the past and evaluate later
   contiguous periods.
2. **Leave-one-site-out holdout** - evaluate transfer to a facility never used
   for fitting.
3. **Site-and-time holdout** - evaluate a new facility in a future period when
   sufficient sites and history exist.
4. **Regime holdout** - separately test heat waves, low-load periods,
   maintenance, hardware transitions, and cooling operating modes.

Results must be grouped by facility, climate, cooling loop, heat rejection,
hardware generation, workload class, and forecast horizon where sample size
allows. Aggregate performance cannot hide a materially failing cohort.

### Exogenous information boundary

Every experiment must declare which driver values would be available at the
prediction timestamp. Results are reported in separate modes:

- **Explanatory backcast:** observed weather and grid series may be used to
  isolate the facility model's conditional fit.
- **Operational forecast:** only driver forecasts, vintages, or scenarios that
  would have been available at the historical prediction timestamp may be used.
- **Long-horizon scenario:** capacity, climate, and grid pathways are explicit
  conditions; the output is not scored or described as an unconditional
  forecast.

Observed future weather, grid intensity, workload, or capacity changes must not
leak into an operational forecast. Headline predictive claims require the
operational mode. Backcast and operational errors must be reported separately.

## 4. Baselines

At minimum, each candidate is compared with:

| ID | Baseline | Purpose |
|---|---|---|
| B0 | Seasonal naive | Tests whether the model beats repeating recent comparable periods |
| B1 | Capacity x utilization x fixed PUE | Represents common static planning arithmetic |
| B2 | Regularized load-and-weather regression | Tests whether model complexity adds value |
| B3 | v0.1 synthetic physics model | Measures improvement from calibration |

Additional domain or published baselines may be added when their data,
implementation, and licensing are compatible.

## 5. Candidate models

The initial comparison should include:

- calibrated physics-only model;
- residual model without mechanistic constraints;
- physics-plus-residual hybrid;
- one global model;
- independently fitted site models; and
- a hierarchical cross-site model.

Model capacity and tuning budgets must be comparable enough that the
architecture comparison is meaningful.

## 6. Metrics

### Point predictions

- mean absolute error (MAE);
- root mean squared error (RMSE);
- weighted absolute percentage error (WAPE);
- signed bias;
- peak-power error; and
- error by horizon and operating regime.

MAPE is not a primary metric because near-zero targets can make it unstable.

### Probabilistic predictions

- empirical interval coverage;
- mean interval width;
- weighted interval score;
- quantile loss; and
- reliability plots by horizon and cohort.

Coverage must be reported with interval width. A trivially broad interval is
not a useful calibrated forecast.

### Physical consistency

- IT energy less than or equal to facility energy;
- PUE and utilization within declared bounds;
- component energy reconciliation;
- non-negative energy, carbon, and water outcomes;
- dimensional-unit checks; and
- monotonicity tests for controlled counterfactuals where physically expected.

### Decision usefulness

When valid counterfactual evidence exists, measure:

- pairwise design-ranking accuracy;
- decision regret relative to the observed or engineering reference;
- stability of rankings under uncertainty; and
- frequency of out-of-distribution refusal.

Decision metrics must not be fabricated from synthetic alternatives and then
presented as empirical validation.

## 7. Carbon and water evaluation

Facility-energy error and emissions-factor error must be reported separately.
Operational-carbon accuracy cannot be attributed entirely to the facility
model when the grid-intensity series is itself modeled.

Water evaluation requires:

- separate withdrawal and consumption targets;
- cooling-loop and heat-rejection classifications;
- water-meter boundary documentation;
- weather and operating-mode context; and
- disclosure of intervals where storage or blowdown prevents simple
  interval-level reconciliation.

Until those conditions are met, water remains exploratory.

## 8. Ablations

Pre-registered ablations should remove one information family at a time:

- workload and utilization;
- weather;
- hardware generation;
- cooling loop;
- heat-rejection system;
- site identity;
- grid pathway; and
- learned residual.

The purpose is to determine what creates predictive value, not merely which
model has the lowest final error.

## 9. Statistical reporting

- Report facility-level distributions, not only pooled rows.
- Use confidence intervals that respect temporal and site clustering.
- Bootstrap by facility-day or a coarser independent block when appropriate.
- Report the number of facilities, facility-months, and valid intervals.
- Correct or clearly label exploratory multiple comparisons.
- Publish negative and subgroup results alongside headline metrics.

## 10. Reproducibility package

Every accepted experiment must include:

- an experiment manifest;
- immutable code revision;
- dataset manifest identifiers and hashes;
- environment and dependency lockfiles;
- configuration and random seeds;
- data-quality report;
- machine-readable metrics;
- figures generated from those metrics; and
- a signed-off claim boundary.

Restricted data and site-specific outputs remain in the approved research
environment. This public repository receives only synthetic, appropriately
licensed public, or release-approved aggregate artifacts. Trained or
governed-data artifacts require the separate review defined in the governance
policy.

## 11. Promotion gate

A model version cannot move from research to decision support until it has:

1. passed the frozen evaluation;
2. received data-owner and domain-expert review;
3. documented applicability and refusal boundaries;
4. completed privacy, security, legal, and responsible-AI review;
5. published a versioned model card; and
6. demonstrated that the proposed use matches the evidence collected.
