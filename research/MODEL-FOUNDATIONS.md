# Model foundations

This document explains conceptual references. The
[forecast model card](../FORECAST-MODEL-CARD.md) and
[coupling specification](RENEWABLE-COUPLING.md) define implemented behavior;
the [research contract](RESEARCH-CONTRACT.md) defines the scientific scope.
Referencing a standard or another model does not certify this implementation.

The demand model uses engineering relationships for hardware power and
facility overhead; the coupled evaluator adds chronological electricity
supply and explicit constraints. Their current parameter values are
synthetic. The references below explain the concepts, not fitted parameters
or observed performance.

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

## Physical renewable coupling

The `/coupling/evaluate` extension connects the same demand model to explicit
physical generation, storage, and grid constraints. It evaluates a specified
portfolio rather than multiplying all consumption by a grid factor.

The physical ledger preserves hourly electricity balance, storage losses,
power limits, and a finite hydro energy budget. It reports unmet load rather
than reducing apparent carbon by silently dropping computing service.
Generation, delivered renewable energy, exports, and curtailed availability
are different quantities. Storage preserves the origin of charging energy;
nuclear and unspecified grid renewables are excluded from the dedicated
renewable-match metric.

Operational source factors, cooling-water requirements, hydro net consumption,
and variable cost have separate declared boundaries. Renewable procurement
instruments and lifecycle carbon are not folded into that ledger. See
[renewable coupling and optimization](RENEWABLE-COUPLING.md) for the complete
method and remaining constraints.

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

The coupled workspace adds synthetic cooling-water requirements and optional
hydro-consumption scenarios, not a validated or complete water footprint.
The overall product objective includes renewable co-optimization, but the
current implementation is a physical scenario evaluator with heuristics.
