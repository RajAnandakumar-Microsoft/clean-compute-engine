# Candidate data-source register

## Status

Every source below is a **candidate for future calibration or context**. None
is currently incorporated into the v0.1 model.

License status was reviewed on 2026-08-29. Terms can change; verify them again
when data is actually retrieved.

| Source | Potential role | Terms status | Repository action now |
|---|---|---|---|
| Microsoft Philly GPU traces | Training-job arrival, duration, allocation, and utilization research | CC BY 4.0 | Link and cite; data may be ingested later with attribution |
| Azure LLM inference traces | Modern inference arrival and token-shape research | CC BY 4.0 stated by dataset | Link and cite; data may be ingested later with attribution |
| Microsoft GreenSKU | Server operational and embodied-carbon methodology | Azure Public Dataset root is CC BY 4.0 | Link and cite; verify subfolder terms before importing code |
| Google Cluster Data and PowerData2019 | General cluster utilization and power-domain behavior | CC BY 4.0 stated in repository | Link and cite; query only a scoped subset if used |
| Alibaba GPU cluster traces | Modern heterogeneous AI-cluster structure | No explicit repository or v2026 data license found | Link and schema metadata only; do not ingest or redistribute |
| NOAA Integrated Surface Database | Historical hourly weather | Open U.S. government access; inspect source metadata | Link now; record station IDs, flags, version, and pull date if used |
| EPA eGRID | Historical U.S. regional average emissions | EPA-produced data is public domain unless specified otherwise | Link now; version-pin and cite any future extract |
| Copernicus ERA5 | Global hourly reanalysis weather | CC BY 4.0 for Copernicus products accessed after 2025-07-02 | Link now; attribution and query provenance required if used |
| Cambium | Future U.S. grid emissions scenarios | Publicly accessible; exact release terms must be checked at download | Link now; do not redistribute a release until its packaged terms are recorded |
| MLPerf Power | Standardized system-level ML power measurements | Measurement code Apache 2.0; PTDaemon requires SPEC EULA; result redistribution terms not explicit | Cite published results only; do not bundle tools or result archives |

## Microsoft Philly GPU traces

- Provider: Microsoft Research, Project Fiddle
- Repository: <https://github.com/msr-fiddle/philly-traces>
- Paper: Jeon et al., "Analysis of Large-Scale Multi-Tenant GPU Clusters for
  DNN Training Workloads," USENIX ATC 2019:
  <https://www.usenix.org/conference/atc19/presentation/jeon>
- License: repository `LICENSE` is Creative Commons Attribution 4.0
  International.
- Applicability limit: 2017 DNN training workloads are not representative of
  modern LLM inference or every production data center.

## Azure public traces and GreenSKU

- Provider: Microsoft Azure
- Repository: <https://github.com/Azure/AzurePublicDataset>
- LLM inference 2023:
  <https://github.com/Azure/AzurePublicDataset/blob/master/AzureLLMInferenceDataset2023.md>
- GreenSKU:
  <https://github.com/Azure/AzurePublicDataset/blob/master/AzureGreenSKUFramework2023.md>
- GreenSKU paper:
  <https://www.microsoft.com/en-us/research/publication/designing-cloud-servers-for-lower-carbon/>
- License: the repository license is CC BY 4.0; the LLM dataset page explicitly
  applies that license and requests citation of its associated paper.
- Applicability limit: request traces provide arrival and token shapes, not
  facility-wide installed capacity, actual GPU utilization, or measured power.
  GreenSKU estimates are not vendor-certified lifecycle assessments.

## Google Cluster Data

- Provider: Google
- Repository: <https://github.com/google/cluster-data>
- ClusterData2019:
  <https://github.com/google/cluster-data/blob/master/ClusterData2019.md>
- PowerData2019:
  <https://github.com/google/cluster-data/blob/master/PowerData2019.md>
- License: CC BY 4.0 is stated in the repository and trace documentation.
- Applicability limit: Borg traces represent broad cluster workloads, not a
  modern AI-only campus. The 2019 trace is large and served through BigQuery.

## Alibaba GPU traces

- Provider: Alibaba Group
- Repository: <https://github.com/alibaba/clusterdata>
- GPU v2026:
  <https://github.com/alibaba/clusterdata/tree/master/cluster-trace-gpu-v2026>
- Associated OSDI 2026 paper:
  <https://www.usenix.org/conference/osdi26/presentation/li-suyi>
- Terms status: no root `LICENSE` file or v2026 directory license was found.
  The README requests citation, but a citation request is not a grant of reuse
  or redistribution rights.
- Policy: do not commit, train on, redistribute, or publish derivatives of the
  downloadable data until written terms or permission cover the intended use.

## Weather

### NOAA Integrated Surface Database

- Provider: NOAA National Centers for Environmental Information
- Landing page:
  <https://www.ncei.noaa.gov/products/land-based-station/integrated-surface-database>
- Potential use: observed hourly temperature, dew point, wind, and station
  quality flags.
- Caveat: document the exact station, reporting gaps, quality flags, and
  retrieval date. Some observations originate with international partners.

### Copernicus ERA5

- Provider: Copernicus Climate Change Service / ECMWF
- Dataset:
  <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels>
- License transition notice:
  <https://forum.ecmwf.int/t/cc-by-licence-to-replace-licence-to-use-copernicus-products-on-02-july-2025/13464>
- License: CC BY 4.0 for products accessed after 2025-07-02.
- Attribution: use the dataset-specific wording from the CDS record and record
  all API query parameters.

## U.S. grid emissions

### EPA eGRID

- Provider: U.S. Environmental Protection Agency
- Landing page: <https://www.epa.gov/egrid>
- EPA data-license statement:
  <https://edg.epa.gov/EPA_Data_License.html>
- Potential use: historical regional average emissions for a location-based
  estimate.
- Caveat: eGRID is annual and average; it is not an hourly marginal-emissions
  forecast.

### Cambium

- Provider: National Laboratory of the Rockies (formerly NREL), for the U.S.
  Department of Energy
- Scenario Viewer: <https://scenarioviewer.nlr.gov/>
- Cambium 2024 levelized workbooks subset DOI:
  <https://doi.org/10.7799/2560791>
- Documentation DOI: <https://doi.org/10.2172/2558937>
- Potential use: scenario-based future average and marginal grid metrics.
- Caveat: record scenario, geography, metric definition, model vintage, and
  packaged license. A projection is not observed ground truth.

## MLPerf Power

- Provider: MLCommons
- Working group:
  <https://mlcommons.org/working-groups/benchmarks/power/>
- Measurement repository: <https://github.com/mlcommons/power-dev>
- License: measurement repository code is Apache 2.0.
- Restriction: SPEC PTDaemon requires its own EULA. Published benchmark results
  do not carry an explicit redistribution license in the repository reviewed.
- Policy: link to and cite a named result round/system; do not describe
  interpolated project values as official MLPerf results.
