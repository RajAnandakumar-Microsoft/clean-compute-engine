# Research contract

**Protocol version:** 0.1

**Status:** Pre-calibration research prototype

**Last updated:** 2026-08-29

## Objective

The Clean Compute Engine investigates whether a physics-informed environmental
world model can make useful, calibrated predictions about data-center
electricity use and operational carbon under changing capacity, workload,
hardware, cooling, weather, and grid conditions.

Water use is a planned secondary outcome. It will not be promoted to a
prediction target until the research has data that distinguishes the internal
cooling loop from the external heat-rejection system.

## Primary research question

> Can a hybrid model, built on engineering constraints and calibrated with
> governed operational telemetry, predict facility electricity and operational
> carbon more accurately and with better-calibrated uncertainty than static
> planning assumptions on facilities and time periods not used for fitting?

## Unit of analysis

The primary observational unit is a deidentified facility-time interval at
hourly or finer resolution. Evaluation occurs at several grains:

- interval-level IT and facility energy;
- daily and monthly energy;
- interval and monthly PUE;
- monthly operational carbon under an explicitly stated emissions basis; and
- water withdrawal and consumption only when the system boundary is complete.

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

These hypotheses are untested. The current v0.1 software demonstrates the
calculation and uncertainty architecture only.

## Model strategy

The intended model is hybrid rather than end-to-end black box:

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
  answerable for the represented facilities; and
- an independent held-out experiment can be frozen without using customer
  content or precise facility locations.

Phase A does not carry a predictive-accuracy target. Its result is a decision
that the data can support Phase B, that the scope must narrow, or that the
research question is not answerable with the available evidence.

### Phase B - predictive gates

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

These are research gates, not service-level commitments.

## Falsification and stop conditions

The project must report a negative or limited result if:

- the hybrid model does not consistently improve on simple baselines;
- apparent gains disappear under site-held-out or forward-time evaluation;
- required meter boundaries cannot be reconciled;
- predictive intervals remain materially miscalibrated;
- performance depends on fields unavailable during real planning;
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
