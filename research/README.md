# Research guide

**Last aligned:** 2026-09-08

The Clean Compute Engine studies data centers and their energy supply as one
connected system. The aim is to understand how buildout, computing, cooling,
generation, storage, and grid choices change environmental impact over time,
then test whether that understanding can support better decisions.

Start with the [project overview](../README.md) for the plain-language thesis.
This index explains the research workstreams and where each document fits.
It is not a second model specification or an alternative charter.

The project is independent and has no organizational sponsor or data partner.
Provider names credit public reference sources only; they do not imply
partnership, privileged access, or endorsement.

## How the research fits together

| Workstream | Question | Evidence needed |
|---|---|---|
| Facility demand and cooling | What computing service is requested, and what electricity and cooling does it require? | Reconciled capacity, workload, energy, cooling, and weather observations |
| Energy-system coupling | How can physical supply, storage, grid access, and permitted deferral serve the same work? | Time-aligned resource profiles, operating limits, storage behavior, and scheduling constraints |
| Decision and optimization research | Which feasible choices improve a declared objective without hiding harm or losing service? | Qualified component models, explicit objectives and caps, independent strategy evaluation, and eventually solver evidence |

Demand prediction is an input to the decision system, not the entire
research purpose. Comparing learned and engineering models tests the demand
component; comparing energy portfolios tests a different question. The
[pilot proposal](DATA-PILOT-PROPOSAL.md) separates the evidence workstreams
before joining them in an experiment.

The current Engine evaluates specified synthetic scenarios. It does not
optimize investments, operate real facilities, or establish that a modeled
improvement will occur in practice.

## Current evidence status

The project is at **R0 - synthetic prototype**. The demand forecast and
coupled evaluator use transparent calculations and synthetic assumptions.
No external operational dataset trains or validates them. The
[experiment directory](../experiments/README.md) contains an example workflow,
not empirical findings.

The sources listed here fall into three different categories:

1. **Methodology references** explain concepts or other models; they do not
   establish this implementation's accuracy or optimality.
2. **Candidate input and calibration sources** may supply measured records,
   externally modeled profiles, or scenario assumptions. Each must be labeled
   correctly, qualified for its intended role, and used under its own terms.
3. **Market context** motivated the product problem but does not validate the
   model or any parameter.

Those categories must not be presented as interchangeable.

## Document ownership and reading order

| Document | Owns | Does not establish |
|---|---|---|
| [Project overview](../README.md) | Thesis, intended world model, current demo, and entry points | Detailed model equations or scientific acceptance rules |
| [Research contract](RESEARCH-CONTRACT.md) | Formal questions, hypotheses, scope, evidence gates, and stop conditions | An implemented capability merely because it is a research goal |
| [Evaluation protocol](EVALUATION-PROTOCOL.md) | Splits, baselines, metrics, information boundaries, and experiment rules | Completed experiments or achieved thresholds |
| [Forecast model card](../FORECAST-MODEL-CARD.md) | Current demand-model inputs, calculations, outputs, and limitations | Coupled supply behavior or calibrated accuracy |
| [Renewable coupling specification](RENEWABLE-COUPLING.md) | Current physical evaluator, dispatch, scheduling, accounting, and inspection | An optimizer, certified accounting, or proven real-world benefit |
| [Model foundations](MODEL-FOUNDATIONS.md) | Conceptual and standards references | Certification or a replacement implementation contract |
| [Assumption provenance](ASSUMPTION-PROVENANCE.md) | Parameter origins and links to code | Calibration by citation alone |
| [Source register](DATA-SOURCE-REGISTER.md) | Candidate sources, evidence type, intended role, terms notes, and limitations | Dataset adoption, permission, or validation by inclusion |
| [Research agenda](RESEARCH-AGENDA.md) | Fields and unresolved evidence needs | An approved data extract or duplicate source catalog |
| [Pilot proposal](DATA-PILOT-PROPOSAL.md) | Workstreams, access request, staffing, sequencing, and deliverables | A committed sponsor, approved access, or completed pilot |
| [Data contracts](../data/README.md) | Existing machine-readable interface and schema boundaries | Coverage of every future generation or scheduling feed |
| [Experiment workflow](../experiments/README.md) | Manifest and reproducibility workflow | Empirical findings from synthetic examples |
| [Governance and release](GOVERNANCE-AND-RELEASE.md) | Data handling and artifact-release requirements | Permission in place of a data owner's approval |
| [Roadmap](../BACKLOG.md) | Priorities and remaining implementation work | A change to the charter or evidence gates |

For a first research review, read the overview, charter, then the evaluation
protocol. For implementation work, read the relevant model specification and
provenance. For a proposed dataset, read the source register, pilot, data
contracts, and governance policy.

Keep formal questions in the charter and calculations in the model documents.
Other pages should link to those definitions rather than maintain competing
copies. Read documents and code from the same revision; unpublished branch
work is not a released capability.

## Contributing and attribution

Useful contributions include source qualification, field/meter review,
reproducible baselines, component calibration, coupled-system evaluation, and
negative findings. Follow [CONTRIBUTING.md](../CONTRIBUTING.md), the
[attribution and licensing rules](ATTRIBUTION-AND-LICENSING.md), and the
[third-party software register](THIRD-PARTY-SOFTWARE.md).

Restricted telemetry and sensitive derived artifacts stay in an approved
controlled environment, not in Git, issues, screenshots, or prompts.

## Integrity statement

No third-party paper, report, dataset, figure, model weights, or source code has
been copied into this folder. References are links and original summaries.

If a source is used in a future model release, the release must record:

- the exact dataset and version;
- retrieval date and immutable identifier when available;
- license and required attribution;
- fields selected and transformations performed;
- parameters fitted from it;
- calibration and held-out validation results; and
- known applicability limits.

## Market-research note

Earlier local notes explored hyperscaler capital spending, neoclouds, data
center financing, colocation, power constraints, and crypto-miner conversions.
They were useful for product discovery, but many relied on secondary articles
and directional estimates. They are intentionally not copied into this
repository as model evidence. The preserved
[product requirements](../REQUIREMENTS.md) are also historical: their broader
promises and old "locked" decisions do not override the current charter,
model specifications, or release rules.

Before market claims are used externally, they should be refreshed and cited
to primary material such as regulatory filings, earnings releases, utility
filings, government data, or official project announcements.
