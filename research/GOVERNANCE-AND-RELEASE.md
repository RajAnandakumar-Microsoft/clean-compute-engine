# Data governance and responsible release

This policy defines the research repository boundary. It is a proposed project
control and does not replace a data-use agreement, applicable employer policy,
legal review, or the requirements of a future data partner.

## Repository boundary

The Git repository may contain:

- source code;
- machine-readable schemas;
- synthetic fixtures that cannot be mistaken for observed telemetry;
- licensed public data when redistribution is explicitly permitted;
- dataset and experiment manifests with non-sensitive metadata;
- aggregate, release-approved research results; and
- methodology, model cards, and attribution.

The Git repository must not contain:

- data-partner or third-party restricted operational telemetry;
- customer or employee content or identifiers;
- precise data-center locations or security-sensitive topology;
- credentials, endpoints, network addresses, or internal system identifiers;
- row-level transformations of restricted data;
- site-specific embeddings, parameters, checkpoints, or logs;
- free-text incidents or operator notes; or
- artifacts whose license or publication approval is unresolved.

The absence of a filename such as `.csv` is not a control. Contributors must
classify content before committing it.

## Data classifications

| Classification | Example | Git policy |
|---|---|---|
| Synthetic | Hand-authored demonstration records | Allowed when prominently labeled |
| Public | Explicitly licensed government or research data | Allowed only after version, attribution, and redistribution review |
| Restricted internal | Governed operational telemetry | Never committed |
| Confidential third party | Partner or vendor data | Never committed unless a written agreement explicitly permits this repository use |

## Required dataset manifest

Every dataset used by an experiment must have a manifest recording:

- owner and source;
- classification;
- version, date range, record count, and content hash;
- schema version and units;
- permitted and prohibited uses;
- license or data-use agreement;
- governance approval reference;
- retention deadline;
- privacy and location reductions;
- transformations;
- train, calibration, validation, and test role; and
- known quality limitations.

A manifest documents permission; it does not create permission.

## Access controls for restricted research

- Use a data-owner-approved controlled environment.
- Grant least-privilege, time-bounded access through managed identities or
  approved user groups.
- Require multifactor authentication and maintain access logs.
- Separate raw, prepared, feature, model, and release-candidate storage.
- Disable unrestricted downloads and public endpoints.
- Store secrets in an approved secret manager, never in notebooks or prompts.
- Review membership and export logs throughout the pilot.
- Delete or archive artifacts according to the approved retention schedule.

## Privacy and facility-security controls

- Replace source identifiers with project-specific pseudonyms.
- Use climate zone, coarse geography, and grid region instead of coordinates.
- Bucket capacity or hardware age in artifacts intended for release.
- Aggregate workload into non-customer-specific classes.
- Exclude prompts, payloads, filenames, tenant metadata, and free text.
- Test whether model artifacts can reveal site membership or sensitive
  operational characteristics.
- Treat unusual events and rare facility combinations as reidentification
  risks, even after names are removed.

Deidentification is a risk-reduction process, not a guarantee of anonymity.

## Research logging

Log:

- experiment and dataset manifest IDs;
- code revision;
- model and configuration version;
- aggregate row counts and quality statistics;
- run time and approved output locations; and
- release-review decisions.

Do not log raw records, customer content, exact locations, credentials, or
unapproved model outputs.

## Responsible open-source boundary

This public repository may include:

- simulation and calibration framework;
- data and experiment schemas;
- synthetic fixtures and generators;
- evaluation harness and baseline implementations;
- documentation and research protocol;
- appropriately licensed public-data adapters; and
- privacy-reviewed generic parameters or model artifacts.

The public repository will not include without separate release approval:

- raw or row-level data-partner telemetry;
- site-specific parameters or residuals;
- model checkpoints trained on restricted data;
- exact facility metadata;
- internal evaluation dashboards; or
- results that allow a facility or operating event to be inferred.

Trained artifacts require their own extraction, memorization, privacy,
facility-security, intellectual-property, and license review. Open-source code
does not imply that every trained weight is safe to release.

## Licensing

Project-authored source code, documentation, schemas, and synthetic fixtures are
licensed under Apache-2.0 unless a file states otherwise. Third-party material
and future datasets retain their own terms.

Before releasing a trained artifact or governed-data result:

1. confirm ownership and authority to release it;
2. assign appropriate terms to datasets and model weights;
3. produce a complete dependency notice bundle;
4. satisfy source-data attribution and share-alike requirements, if any;
5. verify contributor rights; and
6. record third-party components that cannot be redistributed.

## Publication and authorship

- Pre-register the evaluated hypotheses and claim boundary.
- Give authorship for qualifying intellectual contributions, not job title or
  data access alone.
- Acknowledge data, operational, engineering, and review contributions.
- Cite source datasets and prior work according to their terms.
- Publish negative and limiting results.
- Submit data-partner- or employer-related publications through required review
  channels.
- Do not imply sponsorship or endorsement by an employer, data provider, or
  cited source.

## Release approval checklist

A release candidate must have:

- passing software and scientific validation;
- an immutable code revision;
- model and dataset cards;
- aggregate results that reproduce from approved inputs;
- no restricted data in Git history or build artifacts;
- dependency and source-data license review;
- privacy and facility-security assessment;
- data-owner and domain-expert approval;
- legal, responsible-AI, and open-source approval where applicable; and
- a named release owner.

If an approval is missing, the artifact remains internal.
