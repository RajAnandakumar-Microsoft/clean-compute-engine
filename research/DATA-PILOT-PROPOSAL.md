# Proposed governed data pilot

> **Independent proposal:** No organization has reviewed, sponsored, endorsed,
> approved, or committed data or funding to this pilot.

## Purpose

The proposed pilot would determine whether governed data-center
telemetry can calibrate and validate a transferable environmental world model
without exposing customer content, employee data, precise facility locations,
or sensitive operational details.

The request is for controlled research access, not a copy of unrestricted raw
telemetry.

## Research ask

The project seeks:

- an executive or research sponsor;
- a data-center operations data owner;
- sustainability and cooling-domain reviewers;
- privacy, security, legal, and responsible-AI review;
- access to approved deidentified telemetry in a data-partner-controlled
  environment;
- bounded compute for calibration and evaluation; and
- permission to publish reviewed methodology, aggregate findings, and safe
  reusable artifacts.

## Staged scope

### Phase A - feasibility

- one or two deidentified facilities;
- at least 90 continuous days;
- hourly or finer intervals;
- enough fields to reconcile IT and total facility energy;
- one documented cooling and heat-rejection configuration; and
- no model-release commitment.

This phase tests data quality, meter boundaries, joins, and whether the proposed
questions are answerable.

### Phase B - transfer evaluation

- at least four facilities across more than one climate or cooling design;
- at least 12 continuous months per represented cohort where possible;
- multiple workload or hardware regimes;
- frozen leave-one-site-out and forward-time evaluation; and
- formal review of what, if anything, can be generalized.

These are preferred research conditions, not a demand that all data be
available before feasibility work begins.

## Minimum data domains

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
| Grid | Region and approved emissions-factor series or join key | Operational-carbon calculation |
| Events | Maintenance, outage, curtailment, sensor-quality state | Avoid treating abnormal data as ordinary demand |

The canonical machine-readable fields are defined by the contracts under
`backend/app/research/` and exported to `data/schemas/`.

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

## Twelve-week pilot plan

| Weeks | Work |
|---|---|
| 1-2 | Confirm sponsor, research protocol, approvals, schema, and success gates |
| 3-4 | Ingest approved extracts; audit quality, units, joins, and meter boundaries |
| 5-6 | Implement and freeze simple baselines and evaluation partitions |
| 7-8 | Calibrate interpretable utilization, power, and PUE components |
| 9-10 | Evaluate the hybrid residual and hierarchical transfer hypotheses |
| 11 | Run subgroup, uncertainty, leakage, and failure analyses |
| 12 | Produce a reviewed findings report and continuation recommendation |

Water becomes part of the twelve-week evaluation only if its meter and cooling
boundaries pass the data-quality gate.

## Pilot outputs

- approved dataset and field manifests;
- a data-quality and answerability report;
- reproducible baseline results;
- calibrated component models;
- frozen held-out evaluation;
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
- the telemetry data owner; and
- fractional privacy, security, legal, responsible-AI, and open-source review.

Funding should cover the controlled data environment, experiment compute,
research time, and any publication or external expert-review costs. A dollar
request should be prepared only after a prospective data partner confirms the
available environment, personnel, data volume, and willingness to participate.

## Decision at the end of the pilot

The continuation decision is evidence-based:

- **Expand** if the model beats frozen baselines and transfers within useful
  bounds.
- **Narrow** if only specific components or facility classes are predictable.
- **Repeat** if data quality, rather than the hypothesis, blocked evaluation.
- **Stop** if the approach does not add value or creates unacceptable risk.

The pilot is successful if it produces a trustworthy answer, including a
negative one.
