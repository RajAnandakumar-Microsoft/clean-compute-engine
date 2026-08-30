# Assumption provenance

## Summary

No external dataset, trained model, customer telemetry, or proprietary
facility data is used in the current application.

The distinction is:

- **Formulas:** transparent engineering and accounting relationships.
- **Parameters:** hand-authored synthetic priors chosen to produce plausible
  prototype behavior.
- **Results:** internally consistent scenario outputs, not observed or
  validated predictions.

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

The `/story` experience uses illustrative calculations before the forecast is
run. These values are deliberately marked **ILLUSTRATIVE**. The story converts
the user's choices into a real v0.1 forecast request; returned results are
marked **SIMULATED**.

Story-only calculations live in `frontend/src/story/model.ts` and must not be
treated as a separate validated model.

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

These values support interface and systems-behavior demonstrations only.

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
