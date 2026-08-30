# Model foundations

## Current calculation chain

For each simulated hour and Monte Carlo path, v0.1 computes:

```text
IT power =
    installed IT capacity
    x refresh efficiency
    x power response(effective utilization)

facility power =
    IT power
    x PUE(temperature, load, cooling design)

operational carbon =
    facility energy
    x grid emissions intensity
```

The implementation is documented in
[`FORECAST-MODEL-CARD.md`](../FORECAST-MODEL-CARD.md). The formulas are
transparent; the present parameter values are synthetic.

## Power Usage Effectiveness

Power Usage Effectiveness (PUE) relates total data-center energy to IT
equipment energy. The Green Grid developed the metric, and ISO/IEC 30134-2
standardizes it.

The project uses PUE only as an engineering multiplier and dynamic state. It
does not claim that its synthetic hourly PUE response is certified, measured,
or compliant with a particular reporting category.

References:

- The Green Grid, "Power Usage Effectiveness (PUE)":
  <https://www.thegreengrid.org/node/372>
- The Green Grid, "PUE: A Comprehensive Examination of the Metric," White
  Paper 49:
  <https://www.thegreengrid.org/en/resources/library-and-tools/237-WP%2349---PUE%3A-A-Comprehensive-Examination-of-the-Metric>.
  Access may require registration.
- ISO/IEC 30134-2, "Data centres - Key performance indicators - Part 2:
  Power usage effectiveness (PUE)":
  <https://www.iso.org/standard/63451.html>

The Green Grid and ISO publications are copyright-protected reference
materials. This repository does not reproduce their text, tables, or figures.

## Purchased-electricity emissions

The forecast currently resembles a location-based operational estimate:
facility electricity is multiplied by a regional grid-emissions factor. It
does not implement a complete corporate greenhouse-gas inventory, contractual
instrument accounting, residual mixes, or market-based Scope 2 reporting.

Reference:

- World Resources Institute and World Business Council for Sustainable
  Development, "GHG Protocol Scope 2 Guidance":
  <https://ghgprotocol.org/scope-2-guidance>

Future releases should explicitly label average versus marginal emissions and
location-based versus market-based accounting.

## Weather and grid evolution

v0.1 generates weather and grid-carbon shapes from synthetic location
archetypes. NOAA weather, EPA eGRID, ERA5, and Cambium are candidate external
inputs, but none are currently loaded by the application.

See [the data-source register](DATA-SOURCE-REGISTER.md) for access and license
status.

## Uncertainty

P10, P50, and P90 are empirical quantiles across simulated assumption paths.
They express uncertainty inside the stated synthetic assumptions. They are not
calibrated confidence intervals and have not been shown to achieve 10%, 50%,
or 90% empirical coverage on observed facilities.

## Scope boundaries

The v0.1 multi-year forecast includes electricity and operational carbon. It
does not yet forecast:

- water withdrawal or consumption;
- embodied facility or hardware carbon;
- land, ecology, noise, or community impacts;
- transmission construction;
- market-based renewable procurement; or
- live operational telemetry.

The preserved v0.0.1 simulator displays illustrative water and embodied-carbon
values. Those are synthetic prototype outputs, not validated lifecycle or
water-accounting results.
