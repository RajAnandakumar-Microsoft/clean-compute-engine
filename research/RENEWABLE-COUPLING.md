# Renewable coupling and the optimization objective

**Status:** R0 synthetic scenario evaluator. No optimized plan, calibrated
site prediction, or empirical savings claim is produced.

## The purpose is a better energy system, not only a better consumption estimate

This specification describes what the current evaluator does, how its
physical and accounting boundaries work, and which interfaces a future
optimizer would need. It is not a second research charter.

The [project overview](../README.md) introduces the broader vision. The
[research contract](RESEARCH-CONTRACT.md) owns the connected demand,
energy-system, and optimization questions. The
[evaluation protocol](EVALUATION-PROTOCOL.md) owns the evidence needed to
support conclusions. Annual renewable production alone does not describe
how a portfolio serves a growing campus hour by hour.

This premise has substantial prior evidence in annual/hourly procurement
studies and Carbon Explorer; flexibility studies likewise establish
conditional supply/storage benefits. The
[H6-H7 evidence review](MODEL-FOUNDATIONS.md#h6---chronology-and-design-rankings)
records the overlap and limits. The current evaluator is not a replication
result or a novel validated method merely because it implements chronology.
Those studies do not fit its synthetic inputs or validate its heuristic.

## Predict, Optimize, and Operate

| Layer | Decision | Status |
|---|---|---|
| Predict | Evaluate a specified demand and energy-system plan | Implemented with synthetic assumptions |
| Optimize | Search for feasible portfolios and schedules under explicit objectives and caps | Planned; no solver or optimality claim |
| Operate | Compare an approved plan with actual facility operation | Planned; no live connectors or autonomous actions |

The main Engine's Energy view (`/`, with `/energy` as a deep link) extends
**Predict**. It compares a user-specified physical supply portfolio with a
grid-only baseline. Its dispatch and optional work deferral are heuristics,
not an optimizer.
Building this evaluation interface does not need to wait for complete demand
calibration; empirical evidence is still required before using its results for
real decisions.

The Overview, Design, Energy, Water, Compute, and Compare tabs share one
scenario, selected asset, and sampled clock. Source labels, power arrows,
water requirements, the inspector, and expanded hourly charts consume the
same actual path frame. A grid-only comparison maps the paired baseline
frame, not a second unrelated model. The old equipment sandbox is kept
explicitly separate at `/legacy`.

Draft design changes hide calculated flows until applied. Hourly values and
full-run quantiles have separate headings; a schematic rack layout does not
create per-rack or per-GPU forecasts. Changing the sampled month reruns the
same scenario for that trace, rather than inventing unavailable hourly data.

## Implemented physical boundary

The evaluator reuses the existing forecast's hourly capacity, utilization,
hardware, weather, and grid-carbon paths. It does not replace or change the
original `/forecast` request/response contract.

| Component | Representation |
|---|---|
| Demand | One-to-ten-year phased IT buildout, utilization ramp, workload mix, hardware refresh, and dynamic PUE |
| Solar | Synthetic location/daylight/cloud/temperature profile and assumed degradation |
| Wind | Synthetic regional and daily availability; bounded by installed MW |
| Run-of-river hydro | Variable output from a synthetic seasonal/daily availability profile |
| Reservoir hydro | Dispatchable power constrained by a synthetic daily energy budget; not a reservoir hydrology model |
| Nuclear | Adjustable constant-availability generation; not classified as renewable |
| Gas | Dispatchable backup with an explicit synthetic operational-emissions factor |
| Battery | Power and energy limits, round-trip losses, renewable charging origin, and continuous state of charge |
| Grid | Identical import limit and tariffs in both cases, export limit, and explicit remaining unmet load |
| Water | Cooling-water requirement and optional hydro net consumption, kept separate |

All dedicated assets share one optional commissioning date. This version does
not optimize or individually phase generation investments. Renewable plants
are treated as physically available on-site or through a direct connection;
remote power-purchase agreements, certificates, transmission routing, and
contractual delivery are not silently treated as physical supply.

The synthetic site clock is shared by all components. It does not yet
implement real location timezones, daylight-saving transitions, or historical
forecast vintages.

## Chronological dispatch

At each hour the evaluator:

1. Uses available solar, wind, run-of-river hydro, and nuclear proportionally.
2. Releases reservoir energy for remaining demand within its power and daily
   budget limits.
3. Discharges stored energy subject to power, charge, and efficiency limits.
4. Uses available gas backup, then grid imports within the connection limit.
5. Records any remaining demand as **unserved**, rather than inventing supply.
6. Charges batteries from surplus physical generation, then exports within
   the export limit, and curtails the remainder.

Storage begins empty. Charge carries across days, months, and years. Charging
and discharging losses are explicit, and terminal stored energy is not
credited as electricity already delivered to computing. Grid charging is not
enabled in this version.

The original 24-hour dispatcher remains a historical demonstration. Its
representative-day assumptions are not copied into the multi-year evaluator.
Known legacy service, storage and benefit-accounting defects remain open in
the [correction backlog](../BACKLOG.md#demonstration-and-claim-corrections).
Do not use that path as evidence for the coupled evaluator or vice versa.

## Flexible computing without hiding lost work

The baseline retains the original work schedule. The proposed case may defer
a declared fraction of aggregate work to future hours with better synthetic
supply matching. The fraction cannot exceed the declared training and batch
workload shares.

The heuristic preserves the modeled compute-work proxy for every phase and
day, respects installed capacity, and permits at most the specified delay
within the same day. Deferred arrivals cannot be repeatedly deferred past
their original deadline. If no better feasible slot exists, work stays put.
Hardware power and PUE are recalculated after rescheduling.

This is **perfect-foresight scenario analysis**, not a job scheduler or an
operational forecast. It does not model checkpoint costs, job dependencies,
latency objectives, network transfer, or measured application throughput.
Moving work is not guaranteed to reduce carbon, cost, or cooling water.

Conservation of this aggregate proxy is not proof of real completed jobs or
SLA compliance. Published temporal, spatial and combined flexibility results
have different service boundaries; none supplies that missing evidence for
this heuristic. Lower battery throughput also does not demonstrate lower
required installed battery capacity.

## Comparisons and accounting

Both cases use the same requested computing work, buildout, weather, cooling
assumptions, grid-carbon realization, and physical grid connection.
Equal requested work applies over the modeled comparison period, not
necessarily to the load at the same hour after deferral. Selecting the same
timestamp aligns the comparison; it does not imply equal instantaneous demand.

If either case has a shortfall in any sampled hour, the UI withholds headline
savings percentages. Lower emissions caused by failing to serve demand are
not environmental improvements for equivalent computing service.

### Renewable matching

Dedicated renewable coverage measures the share of required electricity
actually served by modeled solar, wind, hydro, and the renewable-origin
portion of battery discharge. It excludes nuclear and unspecified renewable
electricity embedded in the regional grid mix.

Generation charged into a battery is not also counted as direct renewable
delivery. Exported energy does not cancel deficits in other hours. The
full-horizon percentage is energy-weighted; it is not proof of 100% matching
in every hour or a certified 24/7 carbon-free-energy claim.

### Carbon

Operational scenario carbon includes grid imports using the regional average
factor and gas/hydro generation using explicit operational factors. Source
emissions are counted when electricity is produced, including electricity
used for charging or exports; battery discharge is not counted again.

Solar, wind, and nuclear use a zero-direct-emissions assumption in this
boundary. Hydro's factor is explicit and adjustable, not presumed zero.
Embodied plant construction, upstream fuel, lifecycle assessment,
market-based Scope 2, and marginal system-wide avoided emissions are excluded.
Exports receive no automatic avoided-carbon credit.

Physical dispatch, contractual procurement, and emissions accounting are
different ledgers. Future procurement support must follow the applicable
[GHG Protocol Scope 2 guidance](https://ghgprotocol.org/scope-2-guidance) and
record instrument, geographic, temporal, and ownership boundaries.

### Water

The internal cooling loop and external heat rejection are independent choices.
Liquid-cooled IT can still reject heat through an evaporative tower.

Cooling withdrawal and consumption are requirements for the full requested
workload, even if electricity supply is inadequate. The synthetic model uses
IT energy, ambient temperature, a user-specified intensity, and dry,
evaporative, or hybrid rejection. Heat-rejection selection does not
automatically recalibrate PUE; the design-PUE assumption must be considered
alongside it.

Hydro net-consumption intensity is unknown by default. A user may supply an
explicit illustrative intensity, but turbine flow is not consumed water.
The UI never presents unknown hydro consumption as zero or adds the two
categories into a purported complete water footprint. Reservoir evaporation,
ecological flows, other generation water, domestic use, and local watershed
effects need separately qualified evidence.

### Cost

Variable energy cost includes illustrative import/export tariffs, dispatched
source operating costs, and battery-throughput cost. It excludes capex,
financing, demand charges, water tariffs, and full operating expenses.
A cheaper variable-energy result is not a cheaper overall project.

## Outputs and inspection

`GET /coupling/example` supplies a synthetic request.
`POST /coupling/evaluate` returns paired monthly and full-horizon results.
CPU-intensive energy and original forecast runs share the existing single-run
limit; overlapping calls receive HTTP 429.

Outputs include required/served electricity, source generation, grid imports
and peak draw, dedicated renewable delivery, storage losses, curtailment,
exports, shortfall energy/hours, operational carbon, variable cost, and the
separate water metrics. P10/P50/P90 express synthetic assumption variation.

The hourly chart displays seven days from **one actual simulated path**
selected near median full-horizon proposed carbon. Components of that path
balance. Independent component medians are not stacked and misrepresented as
a physically consistent hour.

Typical, hot-dry, and low-renewables cases expose dependence on weather and
resource availability. They are synthetic stress cases, not calibrated
probabilities or outage/reliability guarantees.

## What a future optimizer must decide

The evaluator can become the common scoring core for constrained search.
The following are future interface requirements, not implemented decisions:

| Decision family | Candidate variables and constraints |
|---|---|
| Investment | Source MW, storage MW/MWh, commissioning phases, location, land and budget |
| Dispatch | Generation, charging, discharging, imports and exports with physical limits |
| Work scheduling | Eligible jobs, completion deadlines, workload conservation, latency and throughput requirements |
| Environmental limits | Explicit operational-carbon basis, qualified water budgets, grid-peak caps |
| Objective | Defined total cost or an explicit trade-off frontier, not unexplained mixed-unit weights |

An optimizer must report infeasibility when constraints cannot be met.
It must record the solver, formulation, optimality gap, information available
at decision time, and evidence supporting every input. A feasible heuristic
is not an optimal solution. A modeled reduction in peak import does not by
itself prove lower community electricity bills or avoided grid construction.

## Evidence and private-data workstream

The [pilot proposal](DATA-PILOT-PROPOSAL.md) separates facility-demand
evidence from supply and operating-constraint evidence before joining them.
The [source register](DATA-SOURCE-REGISTER.md) identifies candidates and their
limits; the [governance policy](GOVERNANCE-AND-RELEASE.md) controls access and
release. The current evaluator uses no operational data from those workstreams.
Its physical invariants establish software consistency, not real-world accuracy.
Neither a favorable synthetic delta nor a literature citation satisfies H6-H7.
The protocol requires frozen objectives, feasible service comparisons and
qualified reference evidence before claiming decision usefulness.
