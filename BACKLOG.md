# Clean Compute Engine research roadmap

The repository is now organized as a research project with a working
demonstrator. Calibration, evaluation, governance, and sponsorship take
priority over new product features.

## Public baseline

The initial public snapshot contains the complete v0.1 demonstrator: the
original 24-hour simulator, multi-year probabilistic forecast, voxel story,
research protocol, governed data contracts, and tests. Earlier development
history remains in a separate private archive.

## Current stage: R0 - synthetic prototype

Completed:

- transparent hourly calculation and Monte Carlo architecture;
- working full simulator and interactive story;
- explicit uncalibrated model card and assumption provenance;
- research question, hypotheses, success criteria, and stop conditions;
- frozen evaluation design and baseline requirements;
- governed telemetry and experiment contracts;
- synthetic contract fixtures and schema tests;
- proposed governed data pilot, data exclusions, and release controls.

The next meaningful milestone is not another visualization. It is evidence that
the research question can be answered with appropriately governed data.

## Priority roadmap

| Priority | Workstream | Exit condition |
|---|---|---|
| P0 | Secure sponsor and data owner | Named sponsor, telemetry owner, domain reviewers, and approved feasibility scope |
| P0 | Complete governance intake | Privacy, security, legal, responsible-AI, retention, and publication paths documented |
| P0 | Run data feasibility audit | Meter boundaries, units, completeness, joins, and safe identifiers are answerable for a bounded extract |
| P0 | Freeze first empirical experiment | Dataset manifests, hypotheses, splits, baselines, metrics, and thresholds signed off before fitting |
| P0 | Implement research baselines | Seasonal naive, static-PUE, regularized regression, and v0.1 physics baselines reproduce from manifests |
| P1 | Calibrate physics components | Utilization, power, and dynamic-PUE parameters fitted with complete lineage |
| P1 | Evaluate hybrid residual | Forward-time and site-held-out comparison against every frozen baseline |
| P1 | Test hierarchical transfer | Applicability to unseen facilities measured without pooled-row leakage |
| P1 | Establish uncertainty calibration | Interval coverage and width reported by horizon and cohort |
| P1 | Qualify water as a target | Cooling loop, heat rejection, withdrawal, consumption, and meter boundaries pass the quality gate |
| P1 | Publish governed pilot findings | Reviewed report includes negative results, failures, and continuation decision |
| P2 | Calibrate with licensed public traces | Component-level evidence added where source terms and system boundaries permit |
| P2 | Add weather and grid adapters | Versioned NOAA/ERA5, eGRID, or Cambium inputs with provenance and terms |
| P2 | Prepare calibrated artifact release | Model/data cards, notices, and artifact privacy review complete |
| P3 | Resume optimization research | Only after the predictor establishes useful held-out decision-ranking evidence |
| P3 | Consider live operational connectors | Only inside an approved environment and only after research promotion gates |

## Pilot decision gate

At the end of the proposed twelve-week pilot:

- **Expand** if frozen baselines are beaten and transfer is useful.
- **Narrow** if only specific facilities or model components are predictable.
- **Repeat** if data quality prevented a valid test.
- **Stop** if the approach adds no value or creates unacceptable risk.

A negative, reproducible result is a successful research outcome.

## Product work intentionally parked

- Optimizer and Pareto-frontier search
- Live DCIM or telemetry connectors
- Authentication and multi-tenancy
- Collaborative scenario persistence
- Production deployment and service-level objectives
- Photorealistic or mobile rendering

The existing frontend bundle warning and legacy `/lifetime` extrapolation remain
known software debt, but neither should displace the first empirical experiment.
