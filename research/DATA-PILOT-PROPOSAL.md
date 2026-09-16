# Proposed governed data pilot

> **Independent proposal:** No organization has reviewed, sponsored, endorsed,
> approved, or committed data or funding to this pilot.

**Last aligned:** 2026-09-16

## Purpose

The pilot would investigate a connected data-center and energy-system model:
what computing service requires, and how generation, storage, grid access,
cooling, and permitted scheduling can meet it. It separates facility-demand
evidence from energy-supply and operating-constraint evidence before testing
their interaction.

The request is for controlled research access, not a copy of unrestricted raw
telemetry or permission to operate a facility. The
[research contract](RESEARCH-CONTRACT.md) owns the formal questions and gates;
the [evaluation protocol](EVALUATION-PROTOCOL.md) owns experiment design.
This document owns the proposed evidence collection and delivery plan.

The [related-work review](MODEL-FOUNDATIONS.md#related-work-and-hypothesis-evidence)
supports a bounded validation effort, not an unrestricted data request.
Existing studies neither validate this model nor guarantee that the proposed
facilities, duration, funding or staffing will answer all seven hypotheses.

## Research ask

The project seeks:

- an executive or research sponsor;
- a data-center operations data owner;
- generation, storage, grid, and scheduling data owners where applicable;
- sustainability, cooling, energy-system, and computing-service reviewers;
- privacy, security, legal, and responsible-AI review;
- access to approved deidentified telemetry in a data-partner-controlled
  environment;
- bounded compute for calibration and evaluation; and
- permission to publish reviewed methodology, aggregate findings, and safe
  reusable artifacts.

## Two evidence workstreams, one joined experiment

### Workstream 1 - facility demand and cooling

Use approved deidentified observations to reconcile computing capacity,
requested work, IT energy, facility energy, and cooling behavior. Calibrate
and evaluate the demand components behind hypotheses H1-H5.

Facility cohorts may be defined by buildout, hardware, workload, cooling,
climate, and coarse location. Clustering is not itself a consumption forecast
or evidence of transferability. Cohort definitions and fitted transformations
must not use held-out targets or information unavailable at prediction time.
Hourly patterns, peaks, and seasonal behavior matter, not only annual totals.

### Workstream 2 - supply, storage, grid, and scheduling

Qualify generation availability, hydro constraints, battery performance,
physical grid access, tariffs, and permission to defer work. This workstream
can begin with appropriately licensed public resource/model inputs in
parallel with facility-data approval. Plant-specific operating records and
service constraints require their own owner approval.

The [candidate-source register](DATA-SOURCE-REGISTER.md) distinguishes
observations, externally modeled profiles, and references. No single public
source supplies the entire energy system. A generic training/batch label
does not prove that an actual workload may be delayed.

### Join only after both boundaries are understood

The joined experiment examines H6-H7 using the same requested computing
service, aligned timestamps and geography, explicit grid limits, and
documented storage/dispatch conditions. Assess fixed and flexible demand
against declared energy-strategy baselines.

Different years, unrelated sites, or typical-year weather can support an
explicit conditional scenario, but must not be presented as a coincident
observed facility-and-supply history. Keep observed-operation backcasts,
operational forecasts, and long-horizon scenarios separate. A demand-model
improvement does not validate an energy strategy, and physical energy
balance does not establish demand accuracy.

The pilot does not require a full optimizer or live control. Any later solver
experiment needs a separately frozen formulation and evidence boundary.

### Evidence requests tied to unanswered tests

| Hypothesis | Bounded evidence need | What the evidence must resolve |
|---|---|---|
| H1-H2 | Reconciled IT/facility energy, cooling and approved drivers, with separated fitting and later test periods | Calibration and residual value for our target, not transfer of another paper's temperature or GPU accuracy |
| H3 | Comparable feature availability and quality across the same evaluation blocks | Which approved inputs earn their collection cost in retrained ablations |
| H4 | Enough independent time/site blocks and relevant regimes to assess coverage and width; a defined decision use | Whether intervals are useful and which cohorts or shifts fail |
| H5 | Entire held-out facilities plus an explicitly budgeted adaptation window, when permitted | Zero-shot transfer separately from equal-local-data adaptation |
| H6 | Qualified time-aligned demand/resources, constraints and a common candidate set/reference | Material changes to feasible rankings, not mere differences in simulated totals |
| H7 | Approved aggregate service/completion measures, original deadlines, scheduling permission and enabling overheads | Supply/storage benefits without missing or displaced service |

These are qualification questions for owners, not authorization to export
job identifiers or operational records. If only aggregate work is available,
report a proxy-based scenario and do not claim real job-SLA preservation.
Water remains separately gated by its own meter and system-boundary evidence.

## Staged scope

### Phase A - feasibility

- one or two deidentified facilities;
- at least 90 continuous days;
- hourly or finer intervals;
- enough fields to reconcile IT and total facility energy;
- one documented cooling and heat-rejection configuration;
- one bounded supply case with qualified resource profiles and declared
  connection/storage assumptions;
- an inventory of which operating and scheduling constraints are observed,
  permitted, modeled, or missing; and
- no model-release commitment.

Phase A reports answerability for each workstream separately. It can approve
a narrower demand-only or supply-method experiment if the joined question is
not yet supportable; it must not fill the gap with unlabeled assumptions.
Ninety days can support feasibility work, not a claim of annual resource
adequacy or ten-year forecast accuracy.

### Phase B - qualified demand and strategy evaluation

- at least four facilities across more than one climate or cooling design;
- at least 12 continuous months per represented cohort where possible;
- multiple workload or hardware regimes;
- aligned resource years covering seasonal variability where available;
- documented hydro budgets, storage boundaries, connection limits, and
  eligible-work completion constraints for the coupled cases;
- frozen leave-one-site-out and forward-time evaluation; and
- formal review of what, if anything, can be generalized.

These are preferred research conditions, not a demand that all data be
available before feasibility work begins. Missing seasonal coverage,
operating constraints, or counterfactual evidence narrows the claim.

The proposed site counts and durations are scoping assumptions, not
literature-established sample-size guarantees. After Phase A, justify the
independent-site/time sample size, cohort coverage and detectable effect for
each admitted test before fitting. Narrow or defer tests that lack sufficient
evidence rather than treating 90 days or 12 months as automatic qualification.

## Minimum data domains

### Facility-demand and cooling evidence

| Domain | Minimum fields | Research purpose |
|---|---|---|
| Time and identity | UTC interval, pseudonymous site ID, interval duration | Alignment and grouped evaluation |
| Capacity | Installed and available compute capacity, dated capacity changes | Correct utilization denominator |
| Workload | Aggregate workload class, allocated capacity, active compute | Utilization shape without customer content |
| IT energy | Metered IT energy or synchronized IT power | Calibrate utilization-to-power response |
| Facility energy | Total facility energy and meter boundary | Predict energy and calculate PUE |
| Cooling | Cooling energy, loop type, heat-rejection type, operating mode | Explain dynamic facility overhead |
| Weather | Dry bulb, wet bulb or humidity, quality flags | Model environmental response |
| Water | Withdrawal, consumption, meter boundary, source class | Optional water workstream |
| Grid context | Coarse region and approved emissions-factor series or join key | Align demand with a declared emissions basis |
| Events | Maintenance, outage, curtailment, sensor-quality state | Avoid treating abnormal data as ordinary demand |

### Energy-supply and operating-constraint evidence

| Domain | Minimum fields or approved evidence | Research purpose |
|---|---|---|
| Solar and wind | Resource/profile vintage, interval and timezone, equipment/capacity basis, commissioning, available versus metered generation, curtailment and outage flags | Separate weather-limited availability from actual dispatch |
| Hydro | Run-of-river/reservoir/pumped-storage classification, inflow or energy budget, head/efficiency basis where used, release/power limits and documented operating constraints | Avoid assuming unlimited firm generation or confusing storage with a primary source |
| Battery | Rated and usable MW/MWh, charge/discharge meter boundary, state of charge, efficiency/losses, charging origin, degradation/availability, initial and terminal conditions | Reconcile stored energy and avoid double counting renewable delivery |
| Grid connection | Approved import/export caps, effective dates, connection availability and relevant operating limits | Distinguish regional supply context from what the site can physically exchange |
| Prices and tariffs | Applicable tariff and revision, effective dates, energy/demand/export components, eligibility and any contractual limits | Keep variable-energy calculations separate from full costs |
| Work scheduling | Aggregate arrivals, original completion windows, eligibility, capacity, service constraints, checkpoint/transfer overhead and evidence of permission | Test flexibility without dropping work or inventing service tolerance |
| Environmental accounting | Declared operational/lifecycle and average/marginal basis, factor vintage, ownership boundary and export treatment | Prevent incompatible carbon claims or automatic export offsets |
| Water | Separate cooling withdrawal/consumption and hydro net-consumption allocation, meter/storage boundaries, source and geographic scope | Avoid summing turbine flow, withdrawal, and consumption as one footprint |

These are minimum qualification requirements, not a request to export
security-sensitive operating details. Owners may provide approved derived
constraints instead of raw records; any remaining uncertainty must be explicit.

Existing machine-readable contracts under `backend/app/research/`, exported
to `data/schemas/`, cover facility intervals, site metadata, and manifests.
They do **not** yet define a full generation, storage, grid-constraint, or job
evidence schema. New versioned contracts and owner review are prerequisites
to ingesting those feeds. The `/coupling/evaluate` scenario-input contract is
not a private-telemetry ingestion interface.

## Explicit exclusions

The research dataset does not need and should not contain:

- prompts, model inputs, model outputs, files, or customer payloads;
- tenant, subscription, account, customer, employee, or user identifiers;
- source code, secrets, credentials, network addresses, or access logs;
- workload names that reveal customers or confidential projects;
- exact street addresses, coordinates, floor plans, or security layouts;
- rack, cluster, or asset identifiers that can be joined to operational
  systems outside the approved environment; or
- free-text incident descriptions.

Workload classes should be coarse aggregates such as training, real-time
inference, batch inference, development, mixed, or unknown.

## Proposed secure operating model

1. Data remains in a data-partner-controlled subscription or approved research
   environment.
2. Source identifiers are replaced with project-specific pseudonyms before
   researcher access.
3. Exact location is reduced to approved climate and grid-region attributes.
4. Access uses least-privilege RBAC, multifactor authentication, audit logging,
   and time-bounded membership.
5. Data export is disabled by default. Only reviewed aggregate metrics,
   documentation, and approved model artifacts may leave the environment.
6. Dataset manifests record provenance, permissions, retention, and permitted
   uses.
7. Raw data, derived row-level data, site embeddings, checkpoints, and logs are
   deleted or retained according to the approved schedule.
8. Any open-source or publication candidate receives data-owner, privacy,
   security, legal, and scientific review.

These are proposed controls, not a claim that a controlled research environment
or approvals already exist. The historical private code archive is not an
approved telemetry store by default. Cohort parameters and aggregate outputs
still require review; aggregation alone does not establish release safety.

## Twelve-week pilot plan

| Weeks | Facility-demand workstream | Supply/constraint workstream and joined decisions |
|---|---|---|
| 1-2 | Confirm owner, approved fields, questions, and scope | Confirm source rights, domain reviewers, accounting boundaries, and which questions can be joined |
| 3-4 | Audit approved intervals, capacity denominators, meters, and cooling | Qualify resource vintages, storage/hydro limits, tariffs, scheduling permission, and temporal/geographic joins |
| 5-6 | Freeze baselines, partitions, feature/tuning/local-data budgets and justified coverage/width/error thresholds | Freeze common portfolios, objectives, materiality thresholds, shared computing service, information boundaries, and constraints |
| 7-8 | Calibrate selected demand/PUE components | Reproduce qualified resource/storage behavior and reconcile energy and water boundaries |
| 9-10 | Evaluate held-out demand and any preregistered hybrid/transfer models | Evaluate supported fixed/flexible portfolio cases, including unmet load and declared counterfactual limitations |
| 11 | Report subgroup errors and uncertainty | Report seasonal/stress cases, infeasibility, leakage checks, and sensitivity to missing evidence |
| 12 | Document findings and applicability bounds | Joint review and separate continuation decisions for demand, coupling, water, and optimization readiness |

This is a proposed sequence, not a commitment that every question will be
answered in twelve weeks. Water and flexibility enter the evaluation only
after their meter/system and service-permission gates pass. The current
synthetic deferral heuristic is not evidence of real job schedulability.
The schedule is not a finding from the literature. Each workstream may stop
at feasibility, and no result or publication is promised in advance.

## Pilot outputs

- approved dataset and field manifests;
- a data-quality and answerability report for each workstream and its joins;
- a prior-work comparison specifying what is replicated, changed or still
  unanswered, with matched target and accounting boundaries;
- reproducible demand and energy-strategy baseline results where supported;
- calibrated component models only where fitting is justified;
- frozen held-out evaluation and conditional-scenario results clearly separated;
- an energy/service reconciliation report, including shortfalls and infeasible cases;
- a model card with failures and applicability bounds;
- a privacy and release-risk assessment;
- a recommendation to stop, narrow, repeat, or expand the research; and
- a reviewed list of artifacts eligible for open release.

## Funding and staffing request

The pilot needs protected time from:

- one research or technical lead;
- one data engineer;
- one applied scientist;
- a data-center energy/cooling subject-matter expert;
- an energy-systems reviewer covering renewable generation, hydro, storage,
  grid constraints, and tariffs;
- a computing-service/scheduling reviewer;
- the relevant data owners; and
- fractional privacy, security, legal, responsible-AI, and open-source review.

Funding should cover the controlled data environment, experiment compute,
research time, and any publication or external expert-review costs. A dollar
request should be prepared only after a prospective data partner confirms the
available environment, personnel, data volume, and willingness to participate.

## Decision at the end of the pilot

The continuation decision is evidence-based:

- **Expand** a workstream if it meets its frozen gates; expand joined research
  only when both component evidence and the comparison boundary are adequate.
- **Narrow** if only specific demand components, energy cases, or facility
  classes are supported.
- **Repeat** if data quality, rather than the hypothesis, blocked evaluation.
- **Stop** if the approach does not add value or creates unacceptable risk.

The pilot is successful if it produces a trustworthy answer, including a
negative one.
