# Candidate data-source register

## Status

Every source below is a **candidate for future inputs, calibration, or
context**. None is currently incorporated into the demand forecast or coupled
energy evaluator. A source appearing here is not adopted data, an implemented
adapter, or evidence that the model has been validated.

The existing workload/weather/emissions terms notes reflect the 2026-08-29
review. Energy-supply descriptions were added from primary documentation on
2026-09-08; this is not a completed license approval for every downloadable
release. Verify exact dataset, API, software, and output terms before use.
No candidate dataset was downloaded for this documentation update.

## Evidence workstreams

| Workstream | What to qualify | Important boundary |
|---|---|---|
| Facility demand and cooling | Capacity, workload, measured IT/facility energy, weather response, and cooling-water records | Utilization without a usable capacity denominator does not calibrate total demand |
| Generation and storage | Solar/wind resources, conversion models, observed output, hydro constraints, battery state and losses | Modeled availability, actual generation, and contractual purchases are different quantities |
| Grid and scheduling constraints | Connection limits, applicable tariffs, deferral permission, and service requirements | Regional generation and a generic workload label do not establish site access or schedulability |
| Joined evaluation | Coincident times, compatible locations and system boundaries, shared computing service, and an explicit information cutoff | Unrelated years/sites or a typical meteorological year are conditional scenarios, not an observed joint history |

The [research agenda](RESEARCH-AGENDA.md) owns field requirements. The
[pilot proposal](DATA-PILOT-PROPOSAL.md) owns access and workstream sequencing.
This register owns candidate identities, evidence types, provenance links,
and use limitations.

## Existing demand, weather, and emissions candidates

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

## Energy-supply and operating-context candidates

For the candidates below, the current repository action is **link and cite
documentation only**. Public availability or an API key is not proof of
redistribution rights. Any selected extract or model output needs a version,
hash, permissions/terms record, attribution, and an approved research role.
Software licensing must be checked separately from input-data and generated-
output terms.

| Source | Evidence type | Potential role | Limit that must remain explicit |
|---|---|---|---|
| NLR NSRDB and PVWatts V8 | Satellite-derived solar/weather data and modeled PV output | Solar resource scenarios and an explicit weather-to-generation conversion | Neither is metered output from the modeled data center's solar plant; typical-year weather is not a coincident historical year |
| NLR WIND Toolkit | Modeled meteorology, calculated turbine power, and forecast products | Regional wind profiles and resource/forecast sensitivity | Model output is not observed wind-farm dispatch; turbine and geographic assumptions must match the use |
| USGS Water Data APIs | Monitoring observations, time-series metadata, and quality status | Hydrological context for run-of-river and reservoir scenarios | Gauge discharge is not available hydro MW, an operating right, or water consumption |
| EIA-923 | Reported monthly/annual plant and prime-mover generation and fuel data | Seasonal generation context and coarse reconciliation, including hydro | Cannot resolve hourly matching or establish usable site-specific dispatch constraints |
| EIA Hourly Electric Grid Monitor / EIA-930 | Hourly balancing-authority operating aggregates | Regional demand, generation, and interchange context | Not a facility's physical import cap, dedicated supply delivery, or marginal-emissions estimate |
| NLR System Advisor Model (SAM) battery model | Performance and dispatch model documentation/software | Independent storage-behavior reference and scenario cross-comparison | Not measured battery telemetry or an optimality/accuracy certificate for this implementation |
| OpenEI Utility Rate Database | Structured utility-tariff records | Candidate energy, demand-charge, and time-of-use structures | Applicability, revision, contract terms, and current utility tariff must be confirmed; not a future-price forecast |

### Solar resource and conversion - NSRDB / PVWatts

- Provider: National Laboratory of the Rockies (NLR, formerly NREL).
- NSRDB documentation:
  <https://developer.nlr.gov/docs/solar/nsrdb/>
- PVWatts V8 documentation:
  <https://developer.nlr.gov/docs/solar/pvwatts/v8/>
- NSRDB products differ in resolution, coverage, vintage, and construction;
  record the exact product and distinguish historical-year data from typical
  meteorological year (TMY) products.
- PVWatts converts a specified PV design and weather inputs into production
  estimates. Record DC/AC capacity assumptions, losses, orientation, equipment,
  weather-file identity, and model version. Its default TMY-based estimate
  must not be treated as measured output or an operational weather forecast.
- PVWatts API access requires a developer key; no key or data retrieval is
  needed to cite the documentation.

### Wind resource and conversion - WIND Toolkit

- Provider: NLR, with the collaborators identified in the dataset documentation.
- Documentation: <https://www.nlr.gov/grid/wind-toolkit>
- The documented toolkit includes modeled meteorology and calculated turbine
  power for 2007-2013, with separate forecast products and subsets.
- Record the exact subset, time resolution, height, turbine curve, geography,
  forecast lead time, and forecast issue time where relevant. Other WIND
  products or vintages require their own provenance.
- Do not align a 2007-2013 model year with later measured facility operation
  and call the combination an observed historical record.

### Hydro context - USGS and EIA-923

- USGS water API documentation: <https://api.waterdata.usgs.gov/docs/>
- EIA-923 documentation: <https://www.eia.gov/electricity/data/eia923/>
- USGS offers continuous sensor observations, daily values, and station/
  time-series metadata. Qualify variable, units, quality/provisional status,
  temporal coverage, and the relationship of the gauge to the proposed
  hydrological boundary.
- EIA-923 supplies monthly and annual plant/prime-mover generation context.
  It can constrain seasonal plausibility, not reconstruct an hourly release
  schedule.
- Head, efficiency, reservoir state, inflow/outflow limits, environmental
  releases, outages, and operating permissions still need qualified sources.
  Run-of-river, reservoir generation, and pumped storage must remain distinct.
  Neither source turns turbine flow into net water consumption.

### Regional grid context - EIA-930

- Provider: U.S. Energy Information Administration.
- Hourly Electric Grid Monitor documentation:
  <https://www.eia.gov/electricity/gridmonitor/about>
- Potential role: balancing-authority hourly demand, generation mix, and
  interchange context. Record series definitions, reporting area, timestamps,
  missingness, and revisions.
- Bulk-system aggregates do not establish a particular connection's import/
  export capability or prove that an off-site plant physically serves a
  facility. Use separately qualified emissions factors for the declared
  carbon basis; generation mix alone is not a marginal-emissions model.

### Storage reference - SAM

- Provider: NLR.
- Battery model documentation: <https://sam.nlr.gov/battery-storage.html>
- The model documentation covers PV/generic-system battery configurations,
  front-/behind-the-meter applications, dispatch options, and battery
  performance/degradation.
- Use as a reference or independent scenario comparator with a recorded
  version and configuration. Calibration still needs qualified rated/usable
  capacity, charging/discharging measurements, efficiency, temperature,
  availability, state of charge, and degradation evidence.
- Do not assume another tool's default values are measured parameters for the
  modeled battery. Matching another model is not real-world validation.

### Tariffs - OpenEI Utility Rate Database

- Documentation: <https://openei.org/services/doc/rest/util_rates/>
- Potential role: structured tariff lookup, including time-dependent energy
  and demand-charge structures where supplied. API documentation requires a
  key and version; record the exact tariff identifier and retrieval date.
- Verify eligibility, effective dates, and provisions against the issuing
  utility's authoritative tariff or an approved contract. Account-specific
  negotiations and operational constraints cannot be inferred from a public
  rate record.

### Evidence still requiring an owner-approved source

The register does not yet identify approved sources for actual site connection
limits, plant release rights, or job-deferral permission. Public workload
traces listed below can inform arrivals and duration, but do not establish
service-level tolerance, checkpoint costs, transfer overhead, or permission
to move real jobs.

Those inputs belong in the pilot's operating-constraint workstream. Do not
substitute generic assumptions and then label the resulting experiment
empirical. Restricted source records and sensitive derived constraints stay
in an approved environment; no approval or access is implied here.

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
