# Evaluation protocol

This protocol defines how future calibrated versions of the Clean Compute
Engine will be evaluated. It prevents convenient data splits or metrics from
turning a prototype into an unsupported accuracy claim.

The [related-work review](MODEL-FOUNDATIONS.md#related-work-and-hypothesis-evidence)
provides evidence and limitations for the hypotheses. Published results
motivate comparators, not substitute measurements for this project. A study
with a different target, meter boundary, split, service definition or cost/
carbon scope cannot supply an interchangeable benchmark score.

## 1. Preregistration and dataset freeze

Before fitting begins, an experiment must freeze:

- hypothesis IDs from [the research contract](RESEARCH-CONTRACT.md);
- dataset manifest versions and content hashes;
- inclusion and exclusion rules;
- meter-boundary reconciliation rules;
- train, calibration, validation, and test partitions;
- baseline implementations;
- candidate model configuration;
- feature availability, training/tuning budgets, and any target-site data budget;
- metrics, acceptance thresholds, their decision rationale, and minimum
  cohort evidence requirements; and
- subgroup and ablation analyses.

The held-out test set must remain unavailable to iterative feature and
hyperparameter decisions. Any post-test change creates a new experiment and a
new test boundary.

The charter's initial numerical gates are provisional until this freeze.
Record related-work versions and whether an experiment replicates a published
comparison, adapts one to a new boundary, or tests a proposed new method.

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

For H1-H3, specify the static-PUE calibration rule and give learned comparators
access to the same eligible inputs and training observations, except in
preregistered information ablations. Include an appropriately feature-rich
global/statistical comparator rather than assuming such models lack hardware
or workload information. Record tuning effort and any unavoidable input
differences; gains from extra information are not isolated architecture gains.
See [H1-H3 prior evidence](MODEL-FOUNDATIONS.md#h1---calibrated-physics).

### Energy-strategy comparisons

Coupling evaluation must additionally freeze the demand, computing-service
boundary, grid connection, source availability, storage initial/terminal
conditions, and accounting basis. Compare a grid-only case, a specified
renewable portfolio with fixed demand, and the same portfolio with permitted
flexibility. Annual matching can be an analytical comparator but cannot be
treated as proof of hourly delivery.

The present implementation provides synthetic grid-only and specified-
portfolio cases. It is not an empirical benchmark suite or an optimizer.
Neither case may claim savings from losing load. A comparison that fails to
serve required demand must report infeasibility/shortfall separately.

For H6, preregister a common candidate portfolio set and objective/accounting
basis for annual and chronological assessments. Record initial/terminal
storage treatment, the independent reference used to assess feasibility and
ranking, and thresholds for a material difference. Label conditional ranking
changes separately from empirically demonstrated ranking accuracy. The
[annual/hourly and Carbon Explorer studies](MODEL-FOUNDATIONS.md#h6---chronology-and-design-rankings)
motivate this comparison but do not validate our candidate rankings.

For H7, hold computing service fixed while testing temporal flexibility.
Define completed work, original deadlines, allowed delay, capacity and
permitted overheads. Measure missed, dropped or displaced work explicitly.
Report spatial-only and combined spatial/temporal variants separately if
introduced. Vary installed storage MW/MWh under the same service criterion
before claiming lower required storage; a reduction in discharge throughput
alone is not that result. Include enabling capacity, checkpoint/transfer and
other costs relevant to the claim, or explicitly limit the claim when they
cannot be qualified. The
[flexibility literature](MODEL-FOUNDATIONS.md#h7---flexibility-and-service)
does not establish service preservation for our aggregate-work heuristic.

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

### Transfer and local-data budgets

H5 needs two separately reported arms:

- **Zero-shot:** the target facility contributes no outcome labels to fitting,
  preprocessing, tuning or interval calibration. Compare global and
  hierarchical models using the same permitted metadata and input boundary.
  An independently fitted target-site model is not a zero-shot comparator.
- **Limited-data adaptation:** freeze identical target-site observations and
  tuning budgets for adapted global, hierarchical and local-only models.
  Evaluate later held-out target-site observations. Report the adaptation
  window and learning curve over preregistered data budgets separately from
  zero-shot performance.

Define which contemporaneous or historical meter inputs would actually be
available to each method at prediction time. No target leakage is allowed.
Fit all learned transformations inside the corresponding training boundary;
do not use a held-out PDU as evidence of a wholly unseen facility. These
distinctions follow the limits of the
[transfer and pooling evidence](MODEL-FOUNDATIONS.md#h5---hierarchical-transfer).

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

For H4, freeze a decision-relevant width or interval-induced decision-cost
criterion, nominal coverage, scoring horizon, cohort definitions and minimum
sample requirements. Estimate uncertainty on reported coverage with a
procedure appropriate to site/time dependence; sparse cohorts cannot be
declared calibrated on a pooled score alone.

Report overall and site/regime coverage separately, including defined
distribution shifts. A conformal or other calibration method must state its
exchangeability, dependence or shift assumptions and how calibration data
are kept separate from testing. Do not promise arbitrary-shift or exact
conditional coverage from a marginal guarantee. See the
[interval-method evidence and limitations](MODEL-FOUNDATIONS.md#h4---calibrated-and-useful-intervals).

### Physical consistency

- IT energy less than or equal to facility energy;
- PUE and utilization within declared bounds;
- component energy reconciliation;
- non-negative energy, carbon, and water outcomes;
- dimensional-unit checks; and
- monotonicity tests for controlled counterfactuals where physically expected.

For physical energy coupling, also require:

- source delivery, charging, exports, losses, and curtailment to reconcile;
- generation and grid power limits to hold at every interval;
- storage continuity across days, months, and horizon boundaries;
- an explicit initial and terminal storage boundary;
- renewable-origin accounting without charging/discharging double counting;
- hydro output within the declared flow or energy-budget constraints;
- separate unknown versus zero water quantities; and
- computing-work conservation, capacity limits, and original deferral deadlines.

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

Hydro turbine flow is not water consumption. Net reservoir or other hydro
consumption requires an explicit allocation and system boundary; it must not
be added to cooling withdrawal as if it were the same quantity. Heat rejection
and internal liquid/air cooling must remain separate.

Exports are not automatically avoided emissions. Any marginal-emissions or
grid-benefit claim requires a separate counterfactual and factor definition.
Variable-energy cost excludes capex, financing, and tariff elements that have
not been modeled; do not present it as project economics.

## Optimization evidence boundary

A future optimizer must declare decision variables, objective, environmental
and service caps, feasible baselines, solver/version, optimality gap, and
infeasibility handling. Perfect-foresight results are scenario experiments,
not operational predictions. A heuristic with future information is not an
optimal bound; any bound requires a justified formulation and solver evidence.
Out-of-sample demand and generation conditions, including forecast error, must
be evaluated before claiming robust recommendations.

The current dispatch and work-deferral heuristics make no optimality claim.

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

Coupled-system ablations should separately remove storage, workload
flexibility, hourly resource alignment, and hydro dispatchability while
preserving computing service and the baseline accounting boundary.

The purpose is to determine what creates predictive value, not merely which
model has the lowest final error.

Retrain after removing a feature family, keeping partitions, model-selection
rules and budgets comparable. Preregister important interactions rather than
attributing their combined effect to a single feature. Input sensitivity,
correlation rankings and feature importance alone do not establish
incremental predictive value or causality.

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
