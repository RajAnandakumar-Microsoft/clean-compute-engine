# Clean Compute Engine research roadmap

The research objective is a credible coupled data-center and energy-system
evaluator, then an optimizer of supply, storage, and permitted compute
schedules. Demand calibration is one workstream, not the entire mission.
Coupling can be developed with synthetic profiles while governed data and
empirical evaluation progress in parallel.

## Public baseline

The initial public snapshot contains the complete v0.1 demonstrator: the
original 24-hour simulator, multi-year probabilistic forecast, voxel story,
research protocol, governed data contracts, and tests. Earlier development
history remains in a separate private archive.

## Current stage: R0 - synthetic prototype

Completed:

- transparent hourly calculation and Monte Carlo architecture;
- working full simulator and interactive story;
- mobile-friendly static story on GitHub Pages;
- synthetic `/energy` physical-portfolio comparison with chronological storage,
  finite hydro budgets, bounded work deferral, and explicit shortfalls;
- separate cooling-water requirements and optional hydro net consumption;
- explicit uncalibrated model card and assumption provenance;
- research question, hypotheses, success criteria, and stop conditions;
- frozen evaluation design and baseline requirements;
- governed telemetry and experiment contracts;
- synthetic contract fixtures and schema tests;
- proposed governed data pilot, data exclusions, and release controls.

The next meaningful milestone is evidence that demand estimates and coupled
energy strategies are useful under explicit system boundaries, not simply
more detailed visualization.

## Priority roadmap

| Priority | Workstream | Exit condition |
|---|---|---|
| P0 | Secure sponsor and data owner | Named sponsor, telemetry owner, domain reviewers, and approved feasibility scope |
| P0 | Complete governance intake | Privacy, security, legal, responsible-AI, retention, and publication paths documented |
| P0 | Run data feasibility audit | Meter boundaries, units, completeness, joins, and safe identifiers are answerable for a bounded extract |
| P0 | Freeze first empirical experiment | Dataset manifests, hypotheses, splits, baselines, metrics, and thresholds signed off before fitting |
| P0 | Implement research baselines | Seasonal naive, static-PUE, regularized regression, and v0.1 physics baselines reproduce from manifests |
| P0 | Freeze coupled-system experiment | Same requested work, temporal alignment, source rights, grid limits, storage boundary, and no-shortfall comparison rules are explicit |
| P1 | Calibrate physics components | Utilization, power, and dynamic-PUE parameters fitted with complete lineage |
| P1 | Evaluate hybrid residual | Forward-time and site-held-out comparison against every frozen baseline |
| P1 | Test hierarchical transfer | Applicability to unseen facilities measured without pooled-row leakage |
| P1 | Establish uncertainty calibration | Interval coverage and width reported by horizon and cohort |
| P1 | Qualify water as a target | Cooling loop, heat rejection, withdrawal, consumption, and meter boundaries pass the quality gate |
| P1 | Qualify renewable and storage inputs | Versioned generation/availability data, hydro constraints, battery behavior, and shared weather drivers replace synthetic profiles |
| P1 | Evaluate energy-strategy usefulness | Grid-only, fixed renewable portfolio, bounded-flexibility, and annual-matching baselines are compared without workload loss |
| P1 | Specify constrained co-optimization | Capacity, dispatch, scheduling, cost, carbon, water, and service requirements are frozen; infeasibility and optimality reporting are defined |
| P1 | Publish governed pilot findings | Reviewed report includes negative results, failures, and continuation decision |
| P2 | Calibrate with licensed public traces | Component-level evidence added where source terms and system boundaries permit |
| P2 | Add weather and grid adapters | Versioned NOAA/ERA5, eGRID, or Cambium inputs with provenance and terms |
| P2 | Prepare calibrated artifact release | Model/data cards, notices, and artifact privacy review complete |
| P2 | Implement optimization research | A solver reuses the coupled evaluator; verified physical feasibility and qualified assumptions precede any real-world recommendation |
| P3 | Consider live operational connectors | Only inside an approved environment and only after research promotion gates |

## Pilot decision gate

At the end of the proposed twelve-week pilot:

- **Expand** if frozen baselines are beaten and transfer is useful.
- **Narrow** if only specific facilities or model components are predictable.
- **Repeat** if data quality prevented a valid test.
- **Stop** if the approach adds no value or creates unacceptable risk.

A negative, reproducible result is a successful research outcome.

## Product work intentionally parked

- Production-grade optimizer and real-world investment recommendations
- Live DCIM or telemetry connectors
- Authentication and multi-tenancy
- Collaborative scenario persistence
- Production deployment and service-level objectives
- Photorealistic rendering

The optimizer objective and research requirements are active; the optimizer
itself is not built. The current work-deferral and dispatch heuristics must not
be labeled optimal. The full `/energy` workspace remains local/API-backed;
Pages continues to host only the static story.

The existing frontend bundle warning and legacy `/lifetime` extrapolation remain
known software debt, but neither should displace the first empirical experiment.
