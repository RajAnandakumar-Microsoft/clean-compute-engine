# Assumption provenance

## Summary

No external dataset, trained model, customer telemetry, or proprietary
facility data is used in the current application.

The distinction is:

- **Formulas:** transparent engineering and accounting relationships.
- **Parameters:** hand-authored synthetic priors chosen to produce plausible
  prototype behavior.
- **Results:** synthetic scenario outputs, not observed or validated
  predictions. Correctness claims are limited to inspected calculations
  and tested invariants, not every display or legacy path.

The [related-work review](MODEL-FOUNDATIONS.md#related-work-and-hypothesis-evidence)
explains methodological precedents. Its citations are not the source of the
existing parameter values and do not constitute fitting or empirical
validation. Known legacy accounting defects are listed below and in the
[correction backlog](../BACKLOG.md#demonstration-and-claim-corrections).

## v0.1 forecast

| Component | Current provenance | Code |
|---|---|---|
| Hardware idle-power fractions | Synthetic archetype | `backend/app/forecast/assumptions.py` |
| Hardware power-curve exponents | Synthetic archetype | `backend/app/forecast/assumptions.py` |
| Location temperature levels and amplitudes | Synthetic archetype | `backend/app/forecast/assumptions.py` |
| Location grid-carbon levels and diurnal amplitudes | Synthetic archetype | `backend/app/forecast/assumptions.py` |
| Workload hourly and weekly shapes | Hand-authored prototype functions | `backend/app/forecast/engine.py` |
| Utilization ramps and volatility | User input plus synthetic defaults | `backend/app/forecast/models.py` |
| Dynamic PUE response | User design PUE plus synthetic sensitivities | `backend/app/forecast/engine.py` |
| Grid decarbonization | User input plus synthetic default | `backend/app/forecast/models.py` |
| Phase delays and rare events | Synthetic uncertainty assumptions | `backend/app/forecast/models.py` |
| P10/P50/P90 | Quantiles of simulated paths | `backend/app/forecast/engine.py` |

Hardware names such as H100, A100, GB200, and MI300X identify broad product
classes. The modeled idle fractions and response curves are not
manufacturer-certified performance profiles.

## Interactive story

The `/story` experience uses illustrative calculations before a result is
loaded. These values are marked **ILLUSTRATIVE**. In local/API-backed mode,
the user's choices become a v0.1 forecast request. In static GitHub Pages
mode, they select from 60 precomputed synthetic outcomes (three workloads,
two cooling choices, ten horizons; seed 73 and 96 paths per outcome).
The result presentation is marked **SIMULATED** in either mode; Pages does
not run a hosted forecast API.

P50 is a median across synthetic paths, not an expected value or calibrated
probability. Existing "EXPECTED" labels remain an open interface correction.
The story's proposed/baseline pair changes cooling/PUE and hardware-refresh
assumptions; it is not an isolated cooling experiment. The baseline design PUE
label is not directly comparable to the proposed modeled-average PUE.
Calibration alone would not make the comparison validated: qualified inputs,
held-out evaluation and use-boundary review are still required.

Story-only calculations live in `frontend/src/story/model.ts` and must not be
treated as a separate validated model.

## Coupled energy-system evaluator

The `/energy` workspace uses the same uncalibrated demand model and adds:

| Component | Current provenance | Code |
|---|---|---|
| Solar, wind, and seasonal hydro availability | Hand-authored archetypes plus seeded daily variation | `backend/app/energy/resources.py` |
| Common heat/drought and low-renewables cases | Explicit synthetic stress assumptions, not event probabilities | `backend/app/energy/resources.py` |
| Battery limits, efficiency, and commissioning | User assumptions with synthetic defaults | `backend/app/energy/models.py` |
| Dispatch and reservoir allocation | Chronological heuristic with physical limits, not optimized operation | `backend/app/energy/dispatch.py` |
| Work deferral | Perfect-foresight, bounded same-day aggregate-work heuristic | `backend/app/energy/flexibility.py` |
| Hydro and gas operational carbon | Explicit user assumptions, not source-certified factors | `backend/app/energy/models.py` |
| Variable source costs and battery throughput cost | Illustrative defaults excluding capital/project economics | `backend/app/energy/dispatch.py` |
| Cooling-water intensity and heat response | User-specified synthetic requirement, independent of chip-cooling loop | `backend/app/energy/engine.py` |
| Hydro net water consumption | Unknown unless a user supplies an explicit scenario intensity | `backend/app/energy/models.py` |

No data-center telemetry, measured generation profile, trained clustering
model, or private parameter set is loaded. The comparison preserves requested
work, uses paired exogenous conditions, and reports physical shortages.
Neither percentage changes nor successful energy-balance checks establish
empirical benefits or optimality.

## Preserved v0.0.1 simulator

The legacy simulator contains order-of-magnitude assumptions for:

- GPU nameplate power, memory, and embodied carbon;
- server overhead and idle power;
- energy-source cost, lifecycle carbon, and water;
- regional weather, prices, grid carbon, and water stress;
- PUE temperature sensitivity;
- water-use effectiveness;
- capex, opex, electricity price, and revenue.

The relevant files are `backend/app/config.py`,
`backend/app/sim/physics.py`, and `backend/app/sim/finance.py`.

These values are historical interface assumptions, not reliable benefit
estimates. Known legacy defects include counting unmet demand as served,
crediting an initially charged representative-day battery without charging
provenance, losing work in scheduling redistribution, double-counting capital
in finance, and using the wrong energy denominator for WUE. Its aggregate
clean-energy share is not an every-hour matching guarantee.

Do not use affected legacy savings, finance or lifetime outputs as research
evidence. These are unresolved implementation defects, not merely missing
calibration, and citations cannot repair them. They do not describe the
separate `backend/app/energy/` evaluator. Fixes and scope-specific acceptance
checks remain open in the [backlog](../BACKLOG.md#demonstration-and-claim-corrections).

## Required record for future fitted parameters

Every calibrated parameter should eventually have a machine-readable record
containing:

```text
parameter_id
model_version
dataset_name
dataset_version_or_hash
provider
source_url
retrieved_at
license
required_attribution
source_fields
filtering_and_transformations
fit_method
training_window
validation_window
fit_metrics
applicability_bounds
owner
```

Adding a source to the candidate register does not make a parameter calibrated.
