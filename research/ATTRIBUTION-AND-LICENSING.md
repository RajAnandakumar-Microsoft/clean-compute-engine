# Attribution and licensing

This file is a project-maintenance guide, not legal advice.

## Current project statement

The Clean Compute Engine source is an original proof-of-concept
implementation built with open-source libraries. The current model uses
synthetic, versioned priors and no third-party operational datasets, copied
research figures, or trained weights.

A concise hackathon disclosure is:

> v0.1 is an uncalibrated scenario simulator. Its formulas and assumptions are
> transparent, but its priors are synthetic. Public datasets listed in the
> research register are candidates for future calibration and are not
> incorporated into the current model. This independent project has no
> organizational sponsor or endorsement.

## Rules for research material

1. Link to papers, standards, reports, and data landing pages rather than
   copying them into the repository.
2. Do not copy charts, diagrams, screenshots, tables, or substantial text
   without a license or permission covering that use.
3. Facts and formulas should be restated in original language and cited.
4. Record the exact dataset version and license when data is retrieved.
5. Treat a code license, dataset license, paper copyright, and website terms as
   separate grants.
6. A request to cite a paper is not, by itself, permission to redistribute the
   associated data.
7. Do not use provider names, marks, or logos to imply endorsement.

## CC BY 4.0 sources

If CC BY 4.0 material is incorporated or adapted, retain:

- creator/provider identification;
- source title and link;
- a link to <https://creativecommons.org/licenses/by/4.0/>;
- an indication of modifications; and
- any reasonable attribution requested by the provider.

Suggested record:

```text
Source: [title], [provider/authors], [URL], licensed under CC BY 4.0.
Changes: [filtering, aggregation, normalization, or derived fields].
Accessed: [date]. Dataset version: [version/hash].
```

Current candidates with verified CC BY statements include Microsoft Philly
traces, Azure LLM inference traces, Google Cluster Data, and Copernicus
products accessed under the post-2025-07-02 terms.

## Restricted or unresolved sources

- **Alibaba clusterdata:** no explicit repository or GPU v2026 data license was
  found. Link and describe metadata only. Do not ingest or redistribute until
  permission or terms are confirmed.
- **MLPerf Power:** Apache 2.0 covers the measurement-code repository, not
  automatically SPEC PTDaemon or published result archives. PTDaemon requires
  a SPEC EULA.
- **ISO/IEC 30134-2 and The Green Grid publications:** cite and link only; do
  not reproduce protected standard or white-paper content.
- **Cambium:** inspect and retain the terms packaged with the exact release
  before redistributing files or derived extracts.

## Project source license

Project-authored source code, documentation, schemas, and synthetic fixtures are
released under the Apache License 2.0 unless a file explicitly states otherwise.
Third-party software, papers, standards, and future datasets remain subject to
their own terms. The project license cannot override those terms.

## Third-party software

The repository commits dependency manifests and lockfiles, not dependency
source trees or compiled distributions. See
[Third-party software](THIRD-PARTY-SOFTWARE.md).

Before distributing a compiled frontend or packaged application, generate and
ship complete third-party notices and required license texts for the exact
resolved dependency graph.
