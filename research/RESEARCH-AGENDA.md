# Research agenda

The central research question is:

> How much installed data-center compute will be active each hour, how much
> electricity will that activity require, and how much operational carbon will
> it produce over one to ten years?

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

## 7. Source qualification

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

Minimum preference:

- measured rather than purely synthetic;
- hourly or finer resolution;
- at least three continuous months;
- installed or available capacity;
- actual usage rather than requests alone;
- documented units and schema;
- explicit reuse terms; and
- multiple operating conditions.

## 8. Validation questions

A calibrated release must answer:

- What period and systems were used for fitting?
- What data was held out?
- What are monthly energy and carbon error and bias?
- Do P10/P50/P90 intervals achieve empirical coverage?
- How does accuracy change by workload, hardware, climate, and horizon?
- Which inputs dominate error?
- Where should the model refuse to make a prediction?
