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
- runnable simulator and interactive story, with open corrections below;
- mobile-friendly static story on GitHub Pages;
- synthetic `/energy` physical-portfolio comparison with chronological storage,
  finite hydro budgets, bounded work deferral, and explicit shortfalls;
- separate cooling-water requirements and optional hydro net consumption;
- explicit uncalibrated model card and assumption provenance;
- research question, hypotheses, success criteria, and stop conditions;
- evaluation protocol and baseline requirements; empirical experiment freezes
  remain pending;
- governed telemetry and experiment contracts;
- synthetic contract fixtures and schema tests;
- proposed governed data pilot, data exclusions, and release controls.

The [related-work review](research/MODEL-FOUNDATIONS.md#related-work-and-hypothesis-evidence)
now positions H1-H7 against primary evidence. This is documentation progress,
not an empirical result or a promotion beyond R0.

The next meaningful milestone is evidence that demand estimates and coupled
energy strategies are useful under explicit system boundaries, not simply
more detailed visualization.

## Demonstration and claim corrections

**Open as of 2026-09-16.** Documentation now records these limitations; the
application fixes have not been applied. Resolve or exclude affected surfaces
from the submission path before using them in a release or recorded demo.
Uncalibrated does not mean that broken accounting is acceptable.

| Priority | Surface and correction | Acceptance boundary |
|---|---|---|
| P0 | Legacy served load and initial battery energy (`backend/app/sim/dispatch.py`) | No-source cases report unmet load, not invented delivery; charging origin and repeated-day initial/terminal storage are explicit |
| P0 | Legacy work redistribution and scheduling-benefit prose (`backend/app/sim/physics.py`, `backend/app/sim/engine.py`) | Conserve requested work throughout UI/API-valid ranges, report service failure, use direction-aware deltas and label battery throughput rather than implied capacity savings |
| P0 | Legacy finance and lifetime benefit claims (`backend/app/sim/finance.py`, Finance/Lifetime panels) | Do not subtract capital twice; disclose repeated-day and partial embodied boundaries; withhold invalid service comparisons and invalidate stale results after scheduling changes |
| P0 | Legacy water and clean-energy labels (`backend/app/sim/physics.py`, `backend/app/sim/engine.py`, Finance panel) | WUE uses the declared IT-energy basis; aggregate energy share is not "24/7 clean match"; distinguish nuclear clean energy from renewable accounting |
| P0 | Story statistics and baseline comparison (`frontend/src/story/StoryApp.tsx`, `VoxelWorld.tsx`, forecast response descriptions) | P50 is labeled a synthetic median; paired-delta convention is explained; both PUE values use the same statistic; refresh/PUE changes are disclosed rather than attributed to cooling alone |
| P0 | Story execution and validation language (`StoryApp.tsx`) | Static mode says precomputed, API mode says run; remove calibration-as-sufficient wording and require held-out evidence |
| P0 | Integrated Engine and forecast-panel claim visibility (`WorldApp`, `WorldInspector`, `ForecastPanel`) | Mounted result surfaces disclose synthetic/uncalibrated/non-optimizer status; equal period work is not equal hourly load; correlation bars do not imply causality or completed H3 ablations |
| P1 | Legacy GPU/lifetime and visual encoding | Do not imply an instantaneous-rate lifetime extrapolation is a time-resolved forecast; legends and intensity labels match the actual quantities/scales |

Legacy findings apply to the preserved `backend/app/sim/` path, not the new
`backend/app/energy/` evaluator. Repairs need regression cases for the exact
accounting defect, not only a general build or an additional disclaimer.
If story data assumptions change, regenerate the catalog with the existing
exporter; do not edit its outcomes by hand.

## Priority roadmap

| Priority | Workstream | Exit condition |
|---|---|---|
| P0 | Secure sponsor and data owner | Named sponsor, telemetry owner, domain reviewers, and approved feasibility scope |
| P0 | Complete governance intake | Privacy, security, legal, responsible-AI, retention, and publication paths documented |
| P0 | Run data feasibility audit | Meter boundaries, units, completeness, joins, and safe identifiers are answerable for a bounded extract |
| P0 | Freeze first empirical experiment | Dataset manifests, hypotheses, splits, matched feature/tuning budgets, metrics and justified thresholds signed off before fitting |
| P0 | Implement research baselines | Seasonal naive, static-PUE, regularized regression, and v0.1 physics baselines reproduce from manifests |
| P0 | Freeze coupled-system experiment | Common candidates, objective, material ranking thresholds, reference evidence, same requested work, temporal alignment, source rights, grid/storage limits and no-shortfall rules are explicit |
| P1 | Calibrate physics components | Utilization, power, and dynamic-PUE parameters fitted with complete lineage |
| P1 | Evaluate hybrid residual | Forward-time and site-held-out comparison against every frozen baseline |
| P1 | Test hierarchical transfer | Zero-shot and equal-local-data adaptation reported separately on whole-facility/time holdouts |
| P1 | Establish uncertainty calibration | Coverage, useful width/decision-cost thresholds, cohort evidence and shift failures reported |
| P1 | Qualify water as a target | Cooling loop, heat rejection, withdrawal, consumption, and meter boundaries pass the quality gate |
| P1 | Qualify renewable and storage inputs | Versioned generation/availability data, hydro constraints, battery behavior, and shared weather drivers replace synthetic profiles |
| P1 | Evaluate energy-strategy usefulness | Prior-work-informed grid-only, fixed/flexible and annual/hourly comparisons report service completion, enabling costs and storage-capacity versus throughput effects within the available evidence |
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

The existing frontend bundle warning remains software debt. Legacy accounting
and misleading benefit claims are not merely optional polish: their correction
or exclusion from demonstrations is a release prerequisite, separate from the
first empirical experiment.
