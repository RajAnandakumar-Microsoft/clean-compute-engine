# Research and provenance

This folder records the research trail behind The Clean Compute Engine.

The project is independent and has no organizational sponsor or data partner.
Provider names in this folder identify cited sources or prospective
collaborations only; they do not imply endorsement.

## Current evidence status

The current v0.1 forecast is an **uncalibrated scenario simulator**. It uses
transparent formulas and versioned synthetic priors. It does not contain,
train on, or claim validation from any external operational dataset.

The sources listed here fall into three different categories:

1. **Methodology references** define concepts such as PUE and Scope 2
   electricity emissions.
2. **Candidate calibration sources** may support future data fitting and
   backtesting, subject to their licenses and applicability limits.
3. **Market context** motivated the product problem but does not validate the
   model or any parameter.

Those categories must not be presented as interchangeable.

## Documents

- [Research contract](RESEARCH-CONTRACT.md) - primary question, hypotheses,
  scope, success gates, and falsification criteria.
- [Evaluation protocol](EVALUATION-PROTOCOL.md) - frozen splits, baselines,
  metrics, ablations, and promotion rules.
- [Proposed governed data pilot](DATA-PILOT-PROPOSAL.md) - governed data ask,
  staged pilot, staffing, and twelve-week plan.
- [Data governance and responsible release](GOVERNANCE-AND-RELEASE.md) -
  repository boundary, restricted-data controls, and open-source review.
- [Model foundations](MODEL-FOUNDATIONS.md) - equations, standards, and scope.
- [Assumption provenance](ASSUMPTION-PROVENANCE.md) - what is synthetic today
  and where it appears in code.
- [Candidate data-source register](DATA-SOURCE-REGISTER.md) - official links,
  license status, intended use, and restrictions.
- [Research agenda](RESEARCH-AGENDA.md) - fields and evidence still needed for
  calibration.
- [Attribution and licensing](ATTRIBUTION-AND-LICENSING.md) - repository rules
  for using research and third-party material.
- [Third-party software](THIRD-PARTY-SOFTWARE.md) - direct software
  dependencies and detected licenses.

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
repository as model evidence.

Before market claims are used externally, they should be refreshed and cited
to primary material such as regulatory filings, earnings releases, utility
filings, government data, or official project announcements.

Last reviewed: 2026-08-29.
