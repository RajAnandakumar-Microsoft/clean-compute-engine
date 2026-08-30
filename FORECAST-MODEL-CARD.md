# Forecast model card - v0.1

## Status

**Calibration status:** Uncalibrated

v0.1 is a probabilistic scenario simulator. It calculates internally
consistent consequences of user assumptions and synthetic priors. It does not
claim validated site-level predictive accuracy.

**Research stage:** R0 - synthetic prototype. The hypotheses and evidence
required for promotion are defined in
[`research/RESEARCH-CONTRACT.md`](research/RESEARCH-CONTRACT.md) and
[`research/EVALUATION-PROTOCOL.md`](research/EVALUATION-PROTOCOL.md).

## Intended use

Use v0.1 to:

- describe a phased U.S. data-center buildout;
- explore plausible 1-10 year electricity and operational-carbon outcomes;
- compare an efficient design with a user-defined baseline;
- identify which uncertain assumptions have the greatest influence; and
- establish the software and data contract that real datasets will calibrate.

Do not use v0.1 for permitting, financial commitments, utility procurement,
emissions reporting, or other decisions requiring validated forecasts.

## Hourly calculation

For each simulated hour and Monte Carlo path:

```text
phase utilization =
    utilization ramp
    x workload hourly/weekly shape
    x sampled long-term utilization level
    x short-term demand variation

IT power =
    installed IT MW
    x refresh efficiency factor
    x [idle fraction + (1 - idle fraction) x utilization ^ load exponent]

facility power =
    IT power
    x dynamic PUE(temperature, IT load, cooling type)

operational carbon =
    facility MW
    x grid-carbon gCO2e/kWh
    / 1,000
```

The final division converts one MW-hour at one gCO2e/kWh into metric tonnes.

## Modeled state

- Dated IT-capacity phases and schedule uncertainty
- Initial-to-mature utilization ramps
- Training, real-time inference, batch inference, and development workload mix
- Hardware-specific idle floors and nonlinear power response
- User-defined hardware-refresh interval and efficiency gain
- Seasonal/daily climate shape and sampled weather variation
- Design PUE, cooling type, temperature response, and low-load penalty
- Regional hourly grid shape, grid uncertainty, and annual decarbonization

## Uncertainty

Each path samples stable long-term assumptions and shorter-term hourly/daily
variation. Stable path assumptions make the ten-year futures coherent rather
than independently randomizing every hour.

P10, P50, and P90 are numerical quantiles across simulated paths:

- **P10:** lower modeled outcome
- **P50:** median modeled outcome
- **P90:** higher modeled outcome

These ranges express assumption uncertainty. They are not confidence intervals
for a calibrated predictor.

Scenario and baseline runs use the same seed and paired stochastic structure so
their differences are less sensitive to unrelated random variation.

## Outputs

- Monthly installed capacity, effective utilization, IT energy, facility
  energy, operational carbon, average PUE, and peak facility power
- Cumulative summaries through years 1, 5, and 10 when available
- P10/P50/P90 for every metric
- Paired electricity and carbon deltas against the baseline
- Correlation-ranked drivers of energy and carbon uncertainty
- Model version, assumption-set version, seed, run fingerprint, and disclaimer

## Synthetic priors

The prior library is in `backend/app/forecast/assumptions.py`. All defaults are
visible and versioned. No hidden trained model or customer operational data is
used.

Location and hardware labels identify archetypes, not vendor-certified or
site-certified performance.

## Validation completed

Automated tests verify:

- deterministic reproduction from the same request and seed;
- ordered P10/P50/P90 values;
- utilization, PUE, power, energy, and carbon physical bounds;
- IT-to-facility energy reconciliation;
- paired baseline behavior;
- monotonic reduction in facility energy when PUE is lowered; and
- API and browser workflow integration.

These are correctness tests, not accuracy validation.

## Calibration path

1. Fit workload-shape and volatility parameters from licensed utilization
   traces.
2. Calibrate utilization-to-power curves using measured hardware power data.
3. Fit dynamic PUE against facility load and weather observations.
4. Replace climate and grid priors with versioned NOAA/ERA5 and Cambium inputs.
5. Backtest one, five, and ten-year forecast components where historical
   horizons permit.
6. Measure forecast error, bias, and empirical P10/P50/P90 coverage.
7. Publish applicability bounds and keep the synthetic prior set as a fallback
   only when no calibrated profile applies.
