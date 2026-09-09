# Research agenda

This document owns the fields and unresolved evidence needs for the
[pilot's two workstreams](DATA-PILOT-PROPOSAL.md): facility demand/cooling and
energy supply/operating constraints. The
[research contract](RESEARCH-CONTRACT.md) owns the questions and hypotheses;
the [source register](DATA-SOURCE-REGISTER.md) owns candidate source identities
and terms. Listing a field here is not permission to collect or publish it.

Identifiers and location context must be reduced according to the
[governance policy](GOVERNANCE-AND-RELEASE.md). Owner-approved derived
constraints may be more appropriate than sensitive source records.

## 1. Workload and effective utilization

Required fields:

- timestamp at hourly or finer resolution;
- installed and available GPU/server capacity;
- allocated capacity and actual accelerator activity;
- workload class: training, real-time inference, batch, or development;
- job arrival, queue, start, and completion times;
- hardware generation;
- outages, maintenance, and capacity changes; and
- a stable cluster or facility identifier.

The preferred target is:

```text
effective utilization =
    active accelerator compute-hours
    / available installed accelerator-hours
```

Utilization percentages without an installed-capacity denominator are
insufficient for primary calibration.

## 2. Utilization-to-power response

Required fields:

- accelerator utilization and measured accelerator power;
- idle and peak power;
- CPU, memory, storage, network, and power-supply overhead;
- server and rack power;
- hardware model and firmware/power mode;
- workload class and batch size; and
- synchronized timestamps.

Nameplate TDP alone is insufficient to calibrate a power curve.

## 3. Facility overhead and cooling

Required fields:

- IT energy and total facility energy;
- PUE at hourly or finer resolution;
- cooling, pump, fan, UPS, and distribution losses;
- cooling architecture;
- dry-bulb, wet-bulb, humidity, and dew point;
- water withdrawal and consumption;
- water source and treatment;
- operating mode, economization, and set points; and
- facility location and capacity.

The cooling taxonomy must distinguish direct-to-chip liquid cooling from the
heat-rejection system. A liquid loop may still reject heat through an
evaporative cooling tower and consume substantial water.

## 4. Weather and climate

Research needs:

- historical hourly weather for calibration;
- station selection and quality-control rules;
- future climate scenarios for long horizons;
- heat-wave and humidity extremes; and
- reproducible geographic joins between facilities, weather, and grids.

## 5. Grid electricity and carbon

Required distinctions:

- average versus marginal emissions;
- historical observations versus modeled futures;
- balancing authority, eGRID subregion, and market region;
- hourly versus annual resolution;
- location-based versus market-based Scope 2 treatment; and
- scenario vintage and decarbonization assumptions.

## 6. Long-term evolution

Required evidence:

- dated capacity additions and retirements;
- occupancy and utilization ramps;
- workload-mix changes;
- hardware refresh intervals;
- efficiency improvement by generation;
- facility retrofits; and
- grid and climate scenario evolution.

## 7. Renewable generation and storage

Required evidence:

- time-aligned solar irradiance, temperature, wind, and hydrological drivers;
- equipment, capacity, conversion-model, commissioning, and degradation basis;
- available generation versus dispatched/metered generation, with curtailment
  and outage treatment;
- hydro classification, inflow or energy budgets, release and power limits,
  and documented operating/environmental constraints;
- battery usable energy, charge/discharge power, state of charge,
  efficiency, charging origin, losses, and availability; and
- separate source-level water and carbon factors with explicit allocation,
  system boundary, time period, and observed/modeled status.

Chronology and shared weather conditions matter. A collection of unrelated
typical profiles cannot establish observed joint system performance.
Hydro turbine flow is not net water consumption, and pumped storage is not
an additional primary energy source.

## 8. Grid access, tariffs, and computing-service constraints

Required evidence:

- effective import/export limits, connection availability, and approved
  operating constraints;
- applicable tariff version and eligibility, energy/demand/export charges,
  and the distinction between tariff assumptions and future market prices;
- work arrival, original completion windows, and an agreed computing-service
  or throughput measure;
- explicit permission and capacity to defer work, including latency limits
  and checkpoint/transfer overhead; and
- definitions for unmet load, missed service, and infeasible plans.

Do not infer site connection capacity from regional generation or real
schedulability from a generic training/batch label. Contractual procurement,
physical delivery, and emissions accounting require separate evidence.

## 9. Source qualification

For every dataset, record:

```text
name
provider
official URL
version or immutable identifier
measured or synthetic
date range
time resolution
system boundary
installed-capacity denominator
available utilization and power fields
weather and location coverage
data size and access method
license and attribution
commercial-use status
privacy or contractual restrictions
missing fields
intended use: training, calibration, validation, or context
```

For facility calibration, prefer:

- measured rather than purely synthetic;
- hourly or finer resolution;
- at least three continuous months;
- installed or available capacity;
- actual usage rather than requests alone;
- documented units and schema;
- explicit reuse terms; and
- multiple operating conditions.

For supply and strategy work, additionally qualify resource-year coverage,
forecast vintages, temporal/geographic compatibility, operating constraints,
and the information actually available when a decision would be made.
Externally modeled data can support a declared scenario without becoming
observed validation truth.

## 10. Validation questions

A calibrated release must answer:

- What period and systems were used for fitting?
- What data was held out?
- What are monthly energy and carbon error and bias?
- Do P10/P50/P90 intervals achieve empirical coverage?
- How does accuracy change by workload, hardware, climate, and horizon?
- Which inputs dominate error?
- Where should the model refuse to make a prediction?
- Do the compared energy strategies deliver equivalent computing service?
- Do apparent improvements survive storage losses, hydro/grid constraints,
  seasonal variation, and realistic scheduling permissions?
- Which claims concern conditional scenarios, and which have independent
  empirical or causal support?
