# Research contract

**Protocol version:** 0.3

**Status:** Pre-calibration research prototype

**Last updated:** 2026-09-16

Version 0.3 adds prior-evidence positioning and experimental clarifications.
The H1-H7 statements are unchanged; no experiment is declared complete and
the research stage remains R0.

## Objective

Determine whether a physics-informed model of data centers and their energy
supply can support lower-impact design decisions while preserving computing
service and respecting explicit physical, environmental, and cost constraints.
This requires both credible facility-demand estimates and qualified
generation, storage, grid, cooling, and scheduling models.

This charter owns the formal questions, hypotheses, scope, evidence gates,
and permissible claims. The [project overview](../README.md) introduces the
vision. The [forecast model card](../FORECAST-MODEL-CARD.md) and
[coupling specification](RENEWABLE-COUPLING.md) own current implementation
behavior. The [pilot](DATA-PILOT-PROPOSAL.md) owns evidence collection, and the
[evaluation protocol](EVALUATION-PROTOCOL.md) owns experimental methods.

The current stage remains R0. A working evaluator is not evidence of
predictive accuracy, optimality, or actual environmental benefit.

## Connected research questions

### Demand and facility behavior

> Can a hybrid model, built on engineering constraints and calibrated with
> governed operational telemetry, predict facility electricity and operational
> carbon more accurately and with better-calibrated uncertainty than static
> planning assumptions on facilities and time periods not used for fitting?

### Renewable energy and system design

> For equivalent computing service and explicit physical constraints, how do
> generation, storage, cooling, and workload scheduling change hourly renewable
> matching, grid dependence, operational carbon, water requirements, and cost?

### Decision and optimization research

> Which feasible portfolio and computing schedule best satisfies a declared
> objective under energy, environmental, cost, and service constraints, and
> how robust is that choice to uncertain demand and resource availability?

The current evaluator compares specified portfolios. Solver-based search and
real-world recommendations remain future work. Comparing learned demand
models with engineering arithmetic is one part of the evaluation program,
not a substitute for the coupled-system question.

## Unit of analysis

The primary observational unit is a deidentified facility-time interval at
hourly or finer resolution. Evaluation occurs at several grains:

- interval-level IT and facility energy;
- daily and monthly energy;
- interval and monthly PUE;
- monthly operational carbon under an explicitly stated emissions basis; and
- water withdrawal and consumption only when the system boundary is complete.

Coupled studies also require source, storage, and connection intervals on a
compatible clock, plus a declared computing-service boundary. The unit of
comparison is equivalent requested computing service under specified physical
constraints, not merely two portfolios with different electricity totals.
Observed records, derived quantities, external model outputs, and assumed
future pathways must be identified separately.

Long-horizon outputs are conditional scenarios, not unconditional forecasts.
Capacity plans, hardware refreshes, climate pathways, and grid pathways must be
identified as assumptions or external scenarios.

## Hypotheses

| ID | Hypothesis | Primary test |
|---|---|---|
| H1 | A calibrated physics model outperforms a static-PUE planning baseline. | Held-out facility-month energy error |
| H2 | A hybrid physics-plus-residual model outperforms both the static baseline and the calibrated physics-only model. | Site-held-out and rolling-origin comparisons |
| H3 | Workload, weather, cooling, and hardware features add predictive information beyond capacity and calendar variables. | Pre-registered feature ablations |
| H4 | Predictive intervals can be calibrated to their stated coverage without becoming too broad to support decisions. | Empirical coverage and interval score |
| H5 | A hierarchical model transfers better to unseen facilities than either one global model or independently fitted site models. | Leave-one-site-out evaluation |
| H6 | Chronological supply coupling provides materially different feasible design rankings from annual energy matching. | Same-work, time-aligned portfolio comparisons with qualified generation and demand data |
| H7 | Bounded workload flexibility improves the feasible supply/storage trade-off without losing computing service. | Fixed-demand versus flexible-demand ablation with capacity, completion, and delay constraints |

These hypotheses are **not yet tested by this project**. Relevant external
evidence exists; it does not validate our implementation. The current software
demonstrates calculation, uncertainty, and physical-coupling architecture,
not empirical evidence for H1-H7. Promotion requires the declared experiment
and its held-out evidence.

### Prior evidence and experiment boundaries

The [evidence review](MODEL-FOUNDATIONS.md#related-work-and-hypothesis-evidence)
links primary sources, their relevance, and their limits. Its conclusions are
bounded by the reviewed sources; an unmatched experiment is not proof of novelty.

| Hypothesis | Prior-evidence status | What this project must still test |
|---|---|---|
| H1 | Calibrated physical models exist; the exact facility-energy/static-PUE comparison is not established by the reviewed sources. | Held-out improvement for a defined target, horizon, calibration budget, and strong baselines |
| H2 | Residual correction is established, with mixed results in adjacent applications. | Incremental benefit over calibrated physics and equally informed statistical models, including failures |
| H3 | Workload, weather, and hardware have demonstrated predictive value; the complete controlled feature-group comparison remains open here. | Retraining-based information-value ablations, not correlations or causal claims |
| H4 | Interval methods exist under assumptions; universal conditional-coverage guarantees are not available without restrictions. | Coverage and useful width for defined decisions, cohorts, horizons, and shifts |
| H5 | Transfer and hierarchical energy models exist; hierarchical superiority in the proposed comparison is unestablished. | Separate zero-shot transfer and equal-local-data adaptation arms |
| H6 | Annual/hourly energy-system studies substantially support the central mechanism. | Prior-work-informed replication and quantification of material feasibility/ranking changes under a frozen objective and candidate set |
| H7 | Flexibility can improve supply/storage trade-offs under modeled conditions; real service preservation is conditional. | Benefits, failures, and enabling costs under explicit completion/delay constraints and information limits |

For H5, an independently fitted target-site model requires target-site labels.
It is therefore not a zero-shot comparator. The
[evaluation protocol](EVALUATION-PROTOCOL.md#transfer-and-local-data-budgets)
defines the separate adaptation comparison.

H6-H7 are not claims that chronology or workload flexibility are new ideas.
Any contribution claim must distinguish replication, a changed boundary or
application, and a demonstrated methodological advance. A modeled benefit
for one objective is not proof of lower harm across all objectives.

## Model strategy

The intended hybrid candidate combines the following components rather than
using an end-to-end black box. Simpler models remain valid outcomes if the
additional complexity does not earn its place in the frozen comparison:

1. **Engineering spine:** energy balance, IT-to-facility relationships, physical
   bounds, units, and cooling-system boundaries.
2. **System identification:** fit interpretable power, utilization, thermal, and
   PUE response parameters from measured telemetry.
3. **Residual learning:** model structured error that remains after the
   mechanistic calculation.
4. **Hierarchical transfer:** share information across facilities while
   retaining site-, climate-, hardware-, and cooling-specific effects.
5. **Probabilistic prediction:** quantify aleatoric, parameter, and scenario
   uncertainty separately where the data permits.
6. **Physical coupling:** align demand, generation, storage, and constraints on
   one hourly clock, explicitly expose unmet demand, and keep electricity,
   contractual procurement, carbon, and water accounting distinct.

The model must remain inspectable. A lower-error model is not automatically
preferred if its leakage, instability, or opacity prevents responsible use.

## Scope

### Initial primary outcomes

- IT energy
- Total facility energy
- PUE
- Location-based operational carbon
- Peak facility power

### Secondary outcomes

- Marginal-emissions impact
- Market-based Scope 2 accounting
- Water withdrawal and consumption
- Cooling subsystem energy
- Workload flexibility and grid coincidence

### Coupled-system research measures

Evaluate dedicated renewable delivery, grid imports/exports and peak draw,
storage losses, curtailment, unserved energy, computing-service preservation,
and energy-strategy differences under a declared accounting basis.

Water requires distinct cooling-loop, heat-rejection, withdrawal, consumption,
and hydro allocation boundaries. Cost requires explicit coverage of included
and excluded components. The prototype's synthetic water requirements and
variable-energy costs do not establish a complete water footprint or full
project economics.

### Out of scope until separately validated

- Embodied carbon and full lifecycle assessment
- Financial, permitting, or procurement decisions
- Reliability guarantees and outage prediction
- Autonomous control of live facilities
- Customer-workload inference
- Claims about a named facility from a generic model

## Provisional pilot success criteria

Final criteria must be frozen before each phase begins.

### Phase A - feasibility gates

- the approved extract contains enough continuous intervals to audit the
  proposed targets and drivers;
- IT and facility meter boundaries, units, clocks, and reconciliation tolerance
  are documented;
- installed, available, allocated, and active capacity measures have usable
  definitions;
- missingness and sensor-quality failure modes can be quantified without
  exposing sensitive identifiers;
- cooling, heat rejection, weather, grid, and optional water joins are
  answerable for the represented facilities;
- for coupled studies, resource profiles, storage and hydro boundaries,
  physical grid access, and scheduling permission can be qualified and
  aligned, or their absence explicitly limits the scope; and
- an independent held-out experiment can be frozen without using customer
  content or precise facility locations.

Phase A does not carry a predictive-accuracy target. Its result is a decision
that the data can support Phase B, that the scope must narrow, or that the
research question is not answerable with the available evidence.

### Phase B - demand-prediction gates

Thresholds must be frozen after the Phase A data-quality audit and before model
fitting. The initial targets are:

- at least 10% lower monthly facility-energy MAE than the static-PUE baseline on
  held-out facility-time blocks;
- non-inferior performance to a seasonal-naive baseline in every reported
  facility cohort;
- monthly energy bias within 5% for cohorts with sufficient observations;
- empirical coverage between 75% and 85% for an advertised 80% interval;
- complete energy reconciliation within documented meter-boundary tolerance;
- no material performance claim based only on a random row-level split; and
- explicit refusal or an out-of-distribution warning outside validated bounds.

These are provisional research gates, not achieved results, literature-derived
guarantees, or service-level commitments. Before freezing an experiment, record
the domain/decision rationale for each threshold, cohort sample requirements,
uncertainty on the measured scores, and what would constitute non-inferiority.
Coverage must also meet a preregistered width or decision-cost criterion;
coverage alone is not success.

### Phase B - coupled-system gates

Before a coupled experiment begins, freeze its strategy-comparison metrics
and thresholds independently of the demand-error targets above. At minimum:

- portfolios preserve the declared computing service and accounting boundary;
- energy, storage origin/losses, hydro budgets, and connection limits reconcile;
- shortfalls and infeasible cases are reported rather than counted as savings;
- scheduling respects approved service constraints and information available
  at the decision timestamp;
- effects of resource year, weather, missing constraints, and demand error
  are reported separately; and
- conclusions distinguish observed evidence, conditional model comparisons,
  causal avoided-impact claims, and any future solver optimality claims.

For H6, freeze the common candidate portfolios, objective, reference
evaluation, and thresholds for material ranking/feasibility changes.
For H7, distinguish aggregate work conservation from completed-service
evidence, and installed storage MW/MWh from discharge throughput.
Temporal shifting, spatial routing, and their combined effects require
separate labels and comparisons.

Passing demand gates alone does not establish H6-H7. A synthetic strategy
comparison can support method development without qualifying as empirical
decision evidence.

## Falsification and stop conditions

The project must report a negative or limited result if:

- the hybrid model does not consistently improve on simple baselines;
- apparent gains disappear under site-held-out or forward-time evaluation;
- required meter boundaries cannot be reconciled;
- predictive intervals remain materially miscalibrated;
- performance depends on fields unavailable during real planning;
- apparent energy-strategy gains depend on dropping work, ignoring source or
  connection constraints, or mixing incompatible accounting boundaries;
- released artifacts create unacceptable privacy or facility-security risk; or
- the available data supports only site-specific fitting rather than a
  transferable world model.

Failure to establish transferability is still a useful research result. It
would narrow the project to facility-specific calibration rather than justify a
general model claim.

## Research stages

| Stage | Evidence | Permitted claim |
|---|---|---|
| R0 - synthetic prototype | Software tests and synthetic assumptions | The architecture runs and obeys tested constraints |
| R1 - public-data calibration | Licensed public traces and component backtests | Selected components can be fitted within stated bounds |
| R2 - governed pilot | Deidentified internal telemetry in a controlled environment | Pilot results for represented facilities and periods |
| R3 - cross-site validation | Frozen multi-site holdout evaluation | Transfer performance within published applicability bounds |
| R4 - responsible release | Privacy, security, scientific, and legal review | Approved open artifacts and appropriately bounded model claims |

The repository is currently at **R0**.

## Claim policy

Every published result must identify:

- the research stage;
- dataset manifests and applicable agreements;
- code revision and experiment manifest;
- fitting and held-out periods;
- site, climate, cooling, and hardware coverage;
- baselines and metrics;
- uncertainty calibration;
- known failures; and
- whether the result is synthetic, public-data-based, or restricted-pilot
  evidence.

No result may be described as a validated prediction merely because the
software produces a numerical forecast.
