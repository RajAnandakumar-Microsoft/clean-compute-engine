# Model foundations

This document owns conceptual references and hypothesis-specific related work.
The
[forecast model card](../FORECAST-MODEL-CARD.md) and
[coupling specification](RENEWABLE-COUPLING.md) define implemented behavior;
the [research contract](RESEARCH-CONTRACT.md) defines the scientific scope.
Referencing a standard or another model does not certify this implementation.

The demand model uses engineering relationships for hardware power and
facility overhead; the coupled evaluator adds chronological electricity
supply and explicit constraints. Their current parameter values are
synthetic. The references below explain the concepts, not fitted parameters
or observed performance.

## Related work and hypothesis evidence

**Evidence review date:** 2026-09-15. **Documentation aligned:** 2026-09-16.
This is a bounded primary-source review, not an exhaustive systematic review
or independent replication of the studies. Summaries below distinguish
measured studies, simulations, theory, preprints, and abstract-only evidence.

The [research contract](RESEARCH-CONTRACT.md#hypotheses) owns H1-H7; the
[evaluation protocol](EVALUATION-PROTOCOL.md) owns our tests. All seven remain
untested by this project. Prior evidence can establish a mechanism without
establishing our accuracy or novelty. None of the reviewed sources directly
refutes the bounded hypotheses as proposed; several challenge stronger
interpretations such as "always improves" or "guaranteed at every site."
No exact match in this review does not mean no such study exists.

### H1 - Calibrated physics

- [Abdelsalam, Persoons and Alimohammadi, *A virtual model of data centre
  cooling* (2026)](https://researchprofiles.tudublin.ie/en/publications/a-virtual-model-of-data-centre-cooling/):
  the primary institutional abstract describes measured calibration of a
  single Dublin site's cooling model. Only the abstract was verified; the
  held-out split and static-PUE comparison were not established.
- [Sun et al., *Prototype Energy Models for Data Centers* (2021)](https://eta-publications.lbl.gov/sites/default/files/prototype_energy_models_for_data_centers.pdf):
  detailed EnergyPlus/OpenStudio archetypes are engineering precedent.
  The discussion acknowledges measurement-validation gaps; physical detail
  alone does not prove predictive accuracy.
- [Meta, *How thermal simulation helps optimize Meta's data centers*
  (2022)](https://engineering.fb.com/2022/09/14/data-center-engineering/data-centers-meta-thermal-simulation-optimization/):
  an engineering report compares simulated and measured supply-air
  temperatures, not whole-facility electricity versus static PUE.

**Verdict:** Partial support for calibrated engineering models, not a direct
answer to our held-out facility-month comparison. Test the target and
baselines rather than borrowing cooling or temperature accuracy claims.

### H2 - Learned residual correction

- [Von Krannichfeldt, Orehounig and Fink, *Combining Physics-based and
  Data-driven Modeling for Building Energy Systems* (2024 preprint,
  reviewed 2025 revision)](https://arxiv.org/html/2411.01055v2):
  actual residual learning is compared on measured residential temperatures,
  training on 2020 and testing on 2021. Residual correction performs well
  overall in one setting, but does not win in every room or regime.
- [Saleh et al., *A Physics-Aware Framework for Short-Term GPU Power
  Forecasting of AI Data Centers* (2026 preprint)](https://arxiv.org/html/2605.04074v1):
  measured GPU forecasting with physical regularization gives small,
  metric-dependent gains or ties. Regularization is not additive residual
  correction, and GPU power is not monthly facility energy.

**Verdict:** The correction method is established; its incremental value for
our target is untested. Mixed outcomes challenge universal hybrid-superiority
claims, not the bounded experiment. Cooling-control savings are also not
evidence of prediction accuracy.

### H3 - Information value of inputs

- [Gao, *Machine Learning Applications for Data Center Optimization*
  (2014)](https://www.google.com/about/datacenters/efficiency/internal/assets/machine-learning-applicationsfor-datacenter-optimization-finalv2.pdf):
  measured PUE modeling uses operational and weather inputs. Its randomly
  shuffled split and input-sensitivity analysis do not establish forward-time,
  site-held-out feature-group ablations.
- [Radovanovic et al., *Power Modeling for Effective Datacenter Planning and
  Compute Management* (2021)](https://arxiv.org/abs/2103.13308):
  measured machine/PDU models support hardware/utilization-aware prediction,
  including held-out PDUs in a different week. Architecture and inputs vary
  together, so this is not our controlled ablation.
- [Rivoire, Ranganathan and Kozyrakis, *A Comparison of High-Level Full-System
  Power Models* (2008)](https://www.usenix.org/legacy/events/hotpower08/tech/full_papers/rivoire/rivoire.pdf):
  utilization and richer counters generally help measured machine-power
  models, with exceptions. Older machine-level evidence is not validation of
  all four feature groups at whole-facility scale.

**Verdict:** Strong support for the broad premise, not a new discovery.
Measure incremental information value with retrained, matched comparisons.
Correlation rankings in our synthetic simulator do not perform that test.

### H4 - Calibrated and useful intervals

- [Xu and Xie, *Conformal prediction interval for dynamic time-series*
  (ICML 2021)](https://proceedings.mlr.press/v139/xu21h.html):
  observed solar/wind series demonstrate coverage/width methods, while
  aggregate coverage can hide poor midday coverage.
- [Barber et al., *The limits of distribution-free conditional predictive
  inference*](https://arxiv.org/abs/1903.04684):
  exact distribution-free conditional coverage is impossible without
  restrictions. This limits a stronger universal claim, not a bounded
  empirical test of useful intervals.
- [*Conformal Prediction Under Covariate Shift*](https://arxiv.org/abs/1904.06019)
  and [*Conformal prediction beyond exchangeability*](https://arxiv.org/abs/2202.13415):
  shift/dependence-aware methods require explicit assumptions; their
  guarantees do not cover arbitrary changes in data-center behavior.

**Verdict:** Methods exist under conditions; our interval coverage and decision
usefulness remain untested. Synthetic P10/P50/P90 are not calibrated by
citing these papers. Evaluate width, cohort failures and deployment shifts.

### H5 - Hierarchical transfer

- The [Radovanovic et al. power-modeling study](https://arxiv.org/abs/2103.13308)
  is a strong transfer comparator, not a hierarchical partial-pooling
  experiment. Held-out PDUs are not necessarily held-out facilities;
  local-data use, including previous-day other-equipment power, must be
  accounted for before calling a comparison zero-shot.
- [Kristensen, Hedegaard and Petersen, *Urban-scale dynamic building energy
  modeling and prediction using hierarchical archetypes*
  (2018)](https://publications.ibpsa.org/proceedings/bso/2018/papers/bso2018_P-4.pdf):
  the conference extended abstract, reviewed in full, uses Bayesian sharing
  for aggregate residential heating. It does not establish the proposed
  data-center hierarchical/global/local comparison.
- [Hwang et al., *A growth curve-based Bayesian hierarchical model for
  multi-building energy use data analysis*
  (2021)](https://yonsei.elsevierpure.com/en/publications/a-growth-curve-based-bayesian-hierarchical-model-for-multi-buildi/):
  the verified institutional abstract describes residential hierarchical
  analysis; unseen-site superiority was not established from the abstract.

**Verdict:** Transfer and pooling are established approaches, but superiority
in our comparison remains unresolved. Separate zero-shot transfer from
adaptation using equal local-data budgets and later held-out observations.

### H6 - Chronology and design rankings

- [Riepin and Brown, *On the means, costs, and system-level impacts of
  24/7 carbon-free energy procurement*](https://arxiv.org/abs/2403.07876):
  explicit annual/hourly procurement comparisons show different portfolio
  and cost outcomes in a perfect-foresight European electricity-system
  model. Fixed electrical demand is not an application-service test.
- [Acun et al., *Carbon Explorer* (ASPLOS 2023)](https://arxiv.org/abs/2201.10036)
  and its [implementation](https://github.com/facebookresearch/CarbonExplorer):
  close data-center design prior art comparing renewables, batteries,
  scheduling and their combinations, including extra servers and embodied
  carbon. Full hourly renewable coverage is not always the minimum
  total-carbon design.

**Verdict:** The broad mechanism is substantially answered and supports the
thesis. Our task is replication and quantification under a frozen candidate
set, service boundary and objective. Different rankings alone do not prove
better decisions; our operational-only carbon and variable-cost metrics
cannot be equated with lifecycle or full-cost study objectives.

### H7 - Flexibility and service

- [Carbon Explorer](https://arxiv.org/abs/2201.10036) supplies close offline
  evidence for scheduling/storage trade-offs, with capacity and embodied
  costs. It does not validate our heuristic or actual job SLAs.
- [Riepin, Brown and Zavala, *Spatio-temporal load shifting for truly clean
  computing* (2025)](https://arxiv.org/abs/2405.00036):
  modeled supply/storage benefits combine spatial and temporal flexibility
  while conserving daily aggregate compute. Do not attribute the combined
  gains to temporal shifting alone or call them a real-service trial.
- [Radovanovic et al., *Carbon-Aware Computing for Datacenters*
  (2021 manuscript)](https://arxiv.org/abs/2106.11750):
  production temporal shaping demonstrates operational relevance, but
  aggressive shaping can reduce or displace flexible work. Reduced high-carbon
  hour power is not automatically conserved service or annual carbon savings.
- [Agarwal et al., *Redesigning Data Centers for Renewable Energy*
  (Virtual Battery, HotNets 2021)](https://www.microsoft.com/en-us/research/wp-content/uploads/2021/10/VirtualBattery.pdf):
  trace-driven work shifting/migration is an established alternative to
  relying only on batteries; application and migration overheads remain limits.
- [Reddy et al., *AI Greenferencing: Routing AI Inferencing to Green Modular
  Data Centers with Heron* (2025 preprint)](https://arxiv.org/abs/2505.09989):
  related service-aware spatial routing uses production traces and wind
  traces in simulation. It is not a production deployment or the same
  temporal-deferral/battery experiment.

**Verdict:** Benefits are supported under modeled conditions, with conditional
operational evidence. Completed service, deadlines, forecast error and enabling
costs must be tested. Less battery throughput does not prove less required
installed MW/MWh. Our same-day aggregate-work proxy is not real job completion.

### What the literature does not establish

These sources do not calibrate our defaults, validate our whole world model,
prove savings at a named site, or establish water, investment or lifecycle
claims outside their own boundaries. No reviewed source settles a complete
water footprint for this application. Water-specific evidence remains a
separate workstream.

The [pilot](DATA-PILOT-PROPOSAL.md) and
[evaluation protocol](EVALUATION-PROTOCOL.md) translate these limitations into
bounded data requests and experiments. Citations are methodology references,
not dataset adoption or reuse permission. Keep input provenance in the
[source register](DATA-SOURCE-REGISTER.md) and
[assumption provenance](ASSUMPTION-PROVENANCE.md), with unchanged synthetic
status until actual fitting is documented.

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
