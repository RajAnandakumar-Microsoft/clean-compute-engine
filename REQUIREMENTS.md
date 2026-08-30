# The Clean Compute Engine — Product Spec & POC Requirements

> **Archived product exploration:** This document is preserved with the v0.0.1
> simulator and is not the active research protocol. References to "v1" below
> mean the original Layer 1 concept, not the repository's current semantic
> version. The active charter is `research/RESEARCH-CONTRACT.md`; current model
> behavior is documented in `FORECAST-MODEL-CARD.md`.

> **The product:** a whole-lifecycle data-center intelligence toolkit, built in **three layers**.
> A web-based **3D twin** is the shared core; each layer adds what the user can do with it.
>
> **v1 = Layer 1 (Predict):** a **design-and-predict sandbox**. The user configures a data
> center (its infrastructure *and* its energy sources) and instantly sees how it performs across
> **energy, environment, technical utilization, and finance**, source-aware, down to the GPU.
> Layers 2 (Optimize) and 3 (Operate, live) reuse the same core and come later.
>
> **Status:** Architecture locked (3 layers). Layer 1 requirements below (16 ground rules +
> areas A–G). Ready to build.
> **Maintained by:** Raj Anandakumar · **Updated:** 2026-07-15 · **Product:** *The Clean Compute Engine* (a personal project)

---

## The three layers (read this first)

The product is one **3D digital twin** (a data-center model plus a KPI engine) exposed through
three layers. Each layer reuses the layer below, so the core is **built once and enriched**,
never rebuilt.

| Layer | Name | The user's question | Input | Output | Data | Status |
|---|---|---|---|---|---|---|
| **1** ⭐ | **Predict** (design sandbox) | *"What if I built it this way?"* | A build the user configures (infra + energy sources) | Predicted KPIs: energy, environment, utilization, finance | Synthetic | **v1, this spec** |
| **2** | **Optimize** (advisor) | *"What is the best way to build it?"* | Goals + hard caps (carbon, budget, land) | Recommended build + Pareto frontier | Synthetic | Phase 2 |
| **3** | **Operate** (live twin) | *"How is it doing right now?"* | Live telemetry from the real DC | Real-time state, drift from plan, live actions | Real feeds | Phase 3 |

**Why this order.** An optimizer (L2) is just the L1 simulator wrapped in a search: it has to
*evaluate* candidate builds, which is exactly what L1 does. The live twin (L3) is L1's engine
with synthetic inputs swapped for real feeds. So the build order is forced and de-risked
(predictive, then prescriptive, then real-time): cheapest and most buildable first, the hard
real-data integration last.

**What "negate the impact" means (honest scope).** The engine can drive **net** external impact
(emissions, water, contribution to the grid peak) toward zero or even negative, so the data
center helps the grid. It cannot zero the **energy consumed**; that is thermodynamics. The
promise is "clean, self-sufficient, grid-friendly," never "free."

---

## 1. Why this exists (problem → solution)

**Problem statement**
> America's data centers consume fast-rising amounts of energy and water — and the way we
> power them raises carbon emissions, strains local water supplies, and drives up
> electricity bills for nearby communities. As builders of this technology, closing that
> gap is our responsibility.

**Verified context** *(see ../README.md and DC research notes for full citations)*

| Claim | Figure | Source |
|---|---|---|
| Rising energy | US data centers **4.4%** of national electricity (2023) → **6.7–12%** by 2028 | LBNL, 2024 |
| Corporate emissions pressure | Hyperscaler sustainability reports describe rising emissions during rapid infrastructure growth | Primary reports require refresh before external use |
| Community cost | PJM capacity cost **$2.2B → $14.7B** in one year; data centers ~**97%** of new demand | Utility Dive; IEEFA |
| Water strain | **~17B gallons** used directly in 2023; up to **5M gal/day** per large site | LBNL; EESI |

**Solution statement**
> A single software environment that serves as the shared source of truth for a data
> center's real footprint across its **entire lifecycle** — from the embodied carbon of
> every GPU, through live power, water, and carbon-source metrics in operation, to
> decommissioning. Everyone who builds, operates, sells, and buys data center capacity
> works from the same lifecycle record through their own lens — turning sustainability
> from an after-the-fact report into a **decision they can all act on**.

**What v1 (Layer 1) proves (hero goal):** that one 3D twin lets a user **design** a data center
(its infrastructure and its energy sources) and instantly **see the predicted outcome** across
four dimensions: energy, environment, utilization, and finance, source-aware and down to the
GPU. Sustainability and cost stop being after-the-fact reports and become a design decision you
watch change as you build.

---

## 2. Ground rules (locked)

| # | Category | Rule | Decision |
|---|---|---|---|
| 1 | Technical | Rendering platform | Web-based 3D: **React + Three.js / React Three Fiber** |
| 2 | Product | Hero goal (v1) | **Design-and-predict:** one 3D twin where a user configures a build (infra + energy sources) and sees predicted **energy, environment, utilization, and financial** outcomes, source-aware, down to the GPU |
| 3 | Product | Spatial scope | 1 facility → 1 hall → handful of rows/racks |
| 4 | Product | Drill-down hierarchy | facility → hall → row → rack → server → GPU |
| 5 | Product | Metrics (v1), four dimensions | **Energy** (power, PUE/WUE/CUE, source mix, % clean, curtailment, storage cycles) · **Environment** (live + embodied CO₂e, water, 24/7 clean-match %, grid-peak contribution) · **Utilization** (util %, temp, idle/stranded) · **Financial** (capex, opex, energy $/hr, export + grid-services revenue, heat-reuse credit, payback, ROI, $/compute) |
| 6 | Product | Layer / lifecycle | **Layer 1 = Predict (design-first)** is v1; Optimize (L2) and live Operate (L3) reuse the same core later; embodied CO₂e + end-of-life flag retained |
| 7 | Product | Lenses (v1) | **Sustainability + Financial** (the two that sell) over an **Operator** base view; the design/config panel is the entry point |
| 8 | Technical | Data source | **Fully simulated** synthetic generator; no real integrations (real feeds are Layer 3) |
| 9 | Technical | Sim model | **Workload-driven** (jobs → power/heat/util) **+ rule-based dispatch** of on-site generation & storage; grid carbon + price on 24h curves |
| 10 | Technical | Dispatch policy | **Merit-order heuristic** in v1 (cleanest/cheapest available first, store surplus, grid backup, export/curtail spillover); the optimizer (Layer 2) replaces it |
| 11 | Technical | Fidelity | Stylized/schematic 3D, color-coded; **not** photoreal |
| 12 | Technical | Footprint | Runs locally, single-dev, low/no cloud cost |
| 13 | Guardrail | Non-goals (v1) | No optimizer search (L2), no real feeds/DCIM (L3), no auth/multi-tenant, no persistence beyond session, no mobile, not photoreal |
| 14 | Guardrail | Success criteria | Configure a build → see 3D + predicted four-dimension KPIs → scrub the day (carbon/cost shift) → compare two designs |
| 15 | Technical | Simulated DC scale | **Realistic single hall, parametric** ~30–40 racks / ~2–2.5k GPUs; instanced rendering |
| 16 | Technical | Where sim runs | **FastAPI backend streams telemetry over WebSocket** to R3F client; sim swappable for real feeds |

---

## 3. Scope (v1 = Layer 1: Predict)

**In scope (v1)**
- A **design/config front-end**: pick location, IT build (racks, GPU models, cooling), energy
  sources + capacities (grid, solar, wind, gas, nuclear, battery), workload, and financial
  assumptions.
- One parametric data hall, fully simulated, workload-driven, rendered live in 3D with
  drill-down to the GPU.
- **On-site generation + storage** modeled as first-class assets, served each hour by a
  **rule-based dispatch** policy.
- The full four-dimension metric set (ground rule #5): energy, environment, utilization, and
  **finance** (capex/opex/revenue/payback vs. a grid-only baseline).
- Source-aware carbon and price over a 24h cycle; **scenario compare** (two designs side by side).
- A **smart-scheduling toggle** (flexible load) to show flexibility substituting for storage (P1).

**Out of scope / non-goals (v1)**
- The **optimizer search** (recommending the best build + Pareto frontier): that is **Layer 2**.
- **Real** telemetry / DCIM / cloud / grid-API integrations: that is **Layer 3** (the sim stands
  in behind a swappable interface).
- Authentication, multi-tenancy, persistence beyond the session.
- Mobile / touch; photorealistic rendering.
- Full separate Decommission module (embodied carbon + EOL flag only).
- Stakeholder lenses beyond Operator + Sustainability + Financial.

---

## 4. Area A — Data model / entity schema

**Hierarchy:** `Facility → Hall → [Row] → Rack → Server → GPU` + **Jobs** + **global sim inputs**.
*Row* is a spatial grouping (a coordinate), not a telemetry-bearing entity.

Fields are split into **Static** (set at generation), **Telemetry** (streamed per tick),
and **Derived** (computed).

| Entity | Static | Telemetry | Derived |
|---|---|---|---|
| **Facility** | id, name, region, grid region, climate zone, Tier (I–IV), power capacity (MW), design PUE, water source, commissioned date | — (aggregates up) | total IT kW, total facility kW, PUE/WUE/CUE, live carbon, water L/s, energy today (kWh), $/hr, % renewable, redundancy state |
| **Hall** | id, name, area, rack capacity, cooling type (air/liquid), design density (kW/rack) | — (aggregates) | IT kW, avg/max temp, utilization %, carbon, water, active racks |
| **Rack** | id, row+index position, U-height (42/48U), breaker capacity (kW), cooling type, A/B power feed | power kW, inlet temp, outlet temp | % of capacity, delta-T, utilization %, live carbon, cooling load, health |
| **Server** | id, rack-U slot, model, GPU count, rated power, **embodied CO₂e**, install date, useful life | power kW, utilization %, temp, active job id(s) | live carbon, perf-per-watt, idle flag, remaining life, EOL status |
| **GPU** *(leaf)* | id, model (H100/GB200/A100/MI300…), TDP (W), memory (GB), **embodied CO₂e**, install date, useful life | power W, utilization %, temp °C, mem used, job id | live carbon, perf-per-watt, idle flag, remaining life, EOL status |

**Global sim inputs (facility-level, time-varying)**
- Power-source mix — % grid / solar / wind / gas / nuclear / battery (shifts over the day).
- Grid carbon intensity — gCO₂e/kWh on a 24h curve.
- Electricity price — $/kWh on a 24h curve (drives $/hr).

**Job / workload entity**
`id, type (training / inference / batch), GPUs requested, duration, arrival time, priority,
deferrable? (flexibility flag), state (queued/running/done), placement (GPU ids), power profile`

**Design decisions:** row = grouping only · cooling modeled at hall level (no individual
CRAC/CDU) · GPU is the leaf, CPUs/RAM folded into server baseline power · small set of real
GPU models with realistic TDP + embodied values · `deferrable` flag enables the
grid-flexibility demo.

**Generation & storage assets** *(new in v1 — the energy side of the build)*

| Entity | Static | Telemetry | Derived |
|---|---|---|---|
| **Generation source** (on-site) | id, type (solar/wind/gas/nuclear/fuel-cell), nameplate MW, capex $/MW, opex $/MWh, carbon gCO₂e/kWh, water L/MWh, capacity-factor profile (location + 24h), dispatchable? | output MW (per tick) | energy MWh, carbon, water, cost, curtailed MWh, realized capacity factor |
| **Storage** (battery) | id, energy MWh, power MW, round-trip η, capex, opex, cycle life | soc, charge/discharge MW | cycles, throughput MWh, losses, value captured |
| **Grid connection** | interconnection cap MW, import-price curve, export-price curve, grid-carbon curve, peak-hours set | import MW, export MW | energy imported/exported, cost, revenue, carbon, peak coincidence |

**Design / configuration inputs (v1)** — what the user sets before running a prediction:
- **Location / climate:** drives solar/wind capacity factors, grid-carbon curve, water availability, price curve.
- **IT build:** rack count, GPU models & counts, cooling type (air/liquid), design density, target IT capacity.
- **Energy build:** grid interconnection cap + on-site sources & capacities (solar/wind/gas/nuclear MW) + storage (battery MWh / MW).
- **Workload profile:** compute demand shape (base load + daily pattern) and **% deferrable** (flexibility).
- **Financial assumptions:** electricity tariff, export price, grid-services $/MW-yr, discount rate, horizon (years), heat-reuse value.
- **Toggles:** smart scheduling on/off (shift deferrable load to clean/cheap hours).

---

## 5. Area B — Simulation rules & behavior

**Clock:** real tick ~1 Hz; sim-time compresses a **24h "day"** (pause / speed 1×/10×/60× /
scrub to any hour); one day loops.

**Jobs (cause → effect)**
- **Arrive** stochastically (Poisson), rate higher in daytime; mix of **training** (big, long,
  power-hungry), **inference** (small, steady), **batch** (medium, deferrable).
- **Placed** by a scheduler onto free GPUs (default **pack**; toggle **spread**). No room → queue.
- **Effect:** GPU running a job → util ~90–100%, power → near TDP, temp climbs; **idle** GPU →
  ~30–40% TDP, cool. Metrics sum up the hierarchy.

**Physical models (lightweight)**
- **Thermal:** temp trends toward `ambient + k·utilization − cooling` with a lag → realistic hotspots.
- **Power/PUE:** facility power = IT power × PUE; PUE drifts with cooling load.
- **Carbon (source-aware):** grid intensity + source mix follow a 24h curve (solar dip midday,
  gas/battery evening); live carbon = power × grid intensity.
- **Water:** `f(cooling load, type)`, worse when hot → WUE.
- **Cost:** price curve × power → $/hr.

**Reproducibility:** seeded RNG; scenario presets — **Normal day · Heat wave · Dirty-grid evening**.

**Dispatch (rule-based, v1).** Each hour, to serve load `L_t` from the built assets, in merit order:
1. Use available **on-site renewables** first (solar/wind: zero marginal cost, clean).
2. Surplus renewable → **charge the battery** (to capacity), then **export** to the grid (up to interconnection), else **curtail**.
3. Deficit → **discharge the battery**.
4. Still short → run **dispatchable on-site** (gas/nuclear/fuel-cell) by cost/carbon merit order.
5. Still short → **import from the grid**.

This is a policy, not an optimization. Layer 2 replaces it with a solver that co-sizes the build and the schedule.

**Financial model (v1).**
- **Capex** = IT hardware + on-site generation ($/MW × MW) + storage + facility; **annualized** via a capital-recovery factor (discount rate, asset life).
- **Opex** = generation opex + maintenance + water cost.
- **Energy cost** = grid imports × import price − exports × export price.
- **Revenue / credits** = grid-services ($/MW-yr on firm + flexible capacity offered) + **waste-heat reuse** credit (recovered heat × heat value).
- **Net annual cost** = annualized capex + opex + energy cost − revenue − credits.
- **Baseline** = a grid-only design serving the same load; **savings** = baseline − design.
- **Derived:** simple **payback** (incremental capex / annual savings), **cumulative cash flow** over the horizon (the "money growth" view), **ROI / NPV**, and **$/unit-compute**.

**Smart scheduling (flexible load, P1):** a toggle that shifts **deferrable** jobs toward the cleanest/cheapest hours; shows the before/after and how flexibility **reduces the storage** you need. (A full optimizer that also sizes the build is Layer 2.)

---

## 6. Area C — UX & interactions

**Layout (4-panel):** 3D hall viewport (center) · top bar (facility, sim clock, scenario
picker, global KPIs) · left panel (hierarchy tree + lens toggle) · right panel (inspector) ·
bottom bar (time controls + source-mix / grid-carbon ribbon).

**3D navigation:** orbit / pan / zoom; hover → tooltip; click → select + fly-to zoom;
drill-down click-through with **level-of-detail** (racks-as-blocks → servers → GPUs) and a
**breadcrumb** trail to climb back.

**Inspector (any entity):** identity + static specs · live telemetry with sparklines ·
embodied-vs-operational carbon · lifecycle / remaining life / EOL flag.

**Overlays & lenses:** one active overlay at a time (Temperature · Power · Utilization ·
Carbon · Idle/stranded), legend updates to match; **Operator / Sustainability / Financial** lens toggle.

**Time controls:** play/pause · speed · **scrub the 24h timeline** overlaid with the
grid-carbon curve (jump to a clean/dirty hour and watch the hall recolor).

**Design / config panel (v1 entry point):** the user sets location, IT build, energy sources +
capacities, workload, and financial assumptions, then runs the prediction. Sliders and
dropdowns; sensible defaults; "regenerate" rebuilds the sim from the config.

**Financial dashboard (Financial lens):** cost/revenue waterfall, payback curve, cumulative
cash flow vs. a grid-only baseline, and $/unit-compute. This is the stakeholder view.

**Scenario compare:** save named designs and view them side by side across all four dimensions,
with deltas (e.g., "grid-only vs. solar+battery": −62% carbon, +$3.1M capex, 4.2-yr payback).

**Smart-scheduling panel (P1):** toggle flexible scheduling; preview (e.g., "shift 3 deferrable
jobs to the 2pm solar peak: −18% carbon, less battery needed") → apply → before/after KPI delta.

**Events log:** toasts for hotspots, EOL components, queued jobs, applied optimizations.

**Decisions:** single-select (no multi-select) v1 · one overlay active at a time · guided tour
is optional (P2).

---

## 7. Area D — Visual encoding

**Base scene:** dark theme, stylized cabinets on a subtle grid floor; racks → servers → GPUs
revealed by level-of-detail on drill.

**Overlay color ramps (one active at a time)**

| Overlay | Ramp | Reads as |
|---|---|---|
| Temperature | blue → green → yellow → red | heat map; hotspots glow red |
| Power intensity | dark → bright emissive (∝ kW) | busy racks glow |
| Utilization | grey (idle) → green (used) → amber (over-subscribed) | how hard it's working |
| **Carbon tint** ⭐ | green (clean) → grey → brown (dirty) | **whole hall recolors as the grid changes** |
| Idle / stranded | active solid vs idle ghosted/pulsing | waste pops out |

**Encoding channels (beyond hue):** glow/emissive = activity · fill/height bar = utilization or
capacity · desaturate/ghost = idle or decommissioned · outline/pulse = alerts & selection ·
badge = EOL / health / redundancy state.

**Signature sustainability visuals:** carbon-tint hall recolor across the day (the money shot) ·
source-mix ribbon/donut (live) · embodied-vs-operational split bar (inspector + hall-level).

**Standards:** always-on legend (ramp + range + units); **colorblind-safe** (viridis-style)
palettes. Cinematic extras (airflow particles, shimmer) deferred to P2.

---

## 8. Area E — Functional requirements

Priority: **P0** = must-have for a runnable POC · **P1** = should-have · **P2** = nice-to-have.

| # | Requirement | Priority |
|---|---|---|
| FR-1 | Generate a parametric hall (~30–40 racks / ~2–2.5k GPUs) from seed + params; full hierarchy w/ static specs, embodied carbon & GPU models | P0 |
| FR-2 | Simulation engine: ~1 Hz tick, 24h clock; Poisson job arrivals (training/inference/batch); pack/spread placement; thermal + power/PUE models | P0 |
| FR-3 | Source-aware carbon/water/cost from 24h grid-intensity, source-mix & price curves | P0 |
| FR-4 | Telemetry streaming to client over WebSocket (aggregates + on-demand detail; reconnect) | P0 |
| FR-5 | 3D render of the hall (instanced) with orbit/pan/zoom, hover tooltip, click-select + fly-to | P0 |
| FR-6 | Drill-down with LOD + breadcrumb (hall → rack → server → GPU) | P0 |
| FR-7 | Overlays (5) with legend + lens toggle (Operator/Sustainability); multi-channel encoding | P0 |
| FR-8 | Inspector for any entity (static + live sparklines + embodied-vs-op + lifecycle/EOL) | P0 |
| FR-9 | Global KPI bar (PUE/WUE/CUE, carbon, power, $/hr) + source-mix ribbon | P0 |
| FR-10 | Time controls: play/pause, speed, 24h scrub with grid-carbon curve | P0 |
| FR-11 | ⭐ Carbon-tint hall-wide recolor as the grid changes over the day | P0 |
| FR-12 | Flexibility action preview (shift deferrable jobs); an early taste of Layer 2, see FR-22 | P1 |
| FR-13 | Scenario presets (Normal / Heat wave / Dirty-grid evening) | P1 |
| FR-14 | Events log / toasts (hotspot, EOL, queue, optimization applied) | P1 |
| FR-15 | Cinematic extras (airflow particles, activity shimmer) | P2 |
| FR-16 | Guided tour / onboarding | P2 |
| FR-17 | **Design/config front-end**: set location, IT build, energy sources + capacities, workload, financial assumptions; regenerate the sim from the config | P0 |
| FR-18 | **On-site generation + storage** assets (solar/wind/gas/nuclear/battery) with capacity-factor profiles, generation, curtailment, storage operation | P0 |
| FR-19 | **Rule-based dispatch** (merit order + storage + grid import/export/curtail) serving load each hour | P0 |
| FR-20 | **Financial model + Financial lens**: capex/opex/energy/revenue/heat credit, payback, cumulative cash flow, $/compute, vs. grid-only baseline | P0 |
| FR-21 | **Scenario compare**: save & compare designs side by side across all four dimensions | P1 |
| FR-22 | **Smart-scheduling toggle**: flexible load shifts to clean/cheap hours, with before/after and storage-need delta | P1 |

**P0 spine (FR-1→11, 17→20)** is a complete, demoable story: **configure a build** → generate →
simulate + **dispatch** → stream → visualize → drill → overlay → inspect → scrub time → watch
carbon **and cost** shift → read the **four-dimension KPIs**.

---

## 9. Area F — Non-functional requirements

| Attribute | Target |
|---|---|
| Performance | ~2.5k GPUs at **≥30 fps (60 target)** on a mid laptop, via instancing + LOD; backend tick well inside ~1 Hz |
| Payload efficiency | Stream aggregates + deltas, detail on-demand — not every leaf every tick |
| Responsiveness | Select / drill / overlay-switch <~100 ms; smooth camera transitions |
| Scalability | Parametric; degrade gracefully at larger sizes. 10k+ smooth is *not* a v1 requirement |
| Reliability | WebSocket auto-reconnect; sim survives client disconnect; **deterministic given a seed** |
| Compatibility | Desktop evergreen browsers (Chrome/Edge/Firefox) + **WebGL2**; no mobile |
| Setup / footprint | Runs locally, minimal setup (one backend cmd + one frontend cmd); **no cloud, no API keys** |
| Extensibility | Sim behind a **data interface** so real feeds swap in later; clean sim/streaming/client split |
| Type safety | Typed schemas both ends (**Pydantic ↔ TypeScript**) |
| Accessibility | Colorblind-safe palettes; readable contrast; basic keyboard nav |
| Observability | Basic logging + optional debug HUD (fps, tick time, entity counts) |
| Security | Local-only; no auth in v1; no secrets |

---

## 10. Area G — System architecture

**Shape:** two-tier + streaming.
`[FastAPI backend: sim + WS + REST]  ──WebSocket telemetry──▶  [React + R3F client]`

**Backend (Python 3.11 · FastAPI · Pydantic · NumPy)**

| Module | Role |
|---|---|
| `config` | Design/config schema + defaults + location profiles (capacity factors, grid-carbon, prices) |
| `generator` | Builds the parametric DC from a config → static topology + embodied carbon + GPU models |
| `sim/engine` | Tick loop: advances sim-clock, orchestrates models, deterministic (seeded) |
| `sim/jobs` | Poisson arrivals + scheduler/placer (pack/spread) |
| `sim/generation` | On-site generation + storage assets and their output profiles |
| `sim/dispatch` | Rule-based merit-order dispatch (renewables → storage → dispatchable → grid; export/curtail) |
| `sim/physics` | Thermal, power/PUE, carbon, water models (NumPy-vectorized) |
| `sim/finance` | Capex/opex/energy/revenue/heat-credit, payback, cash flow, grid-only baseline compare |
| `sim/aggregate` | Rolls telemetry up facility → hall → rack → server → GPU |
| `sim/schedule` | Smart-scheduling of deferrable load (a taste of Layer 2) |
| `curves` | Bundled 24h grid-intensity, source-mix, price curves + scenario presets |
| `models` | Pydantic schemas (mirrored to TS) |

**API surface**
- **REST:** `POST /config` (build the DC from a design config) · `GET /model` (static topology) ·
  `GET /scenarios` · `POST /control` (play/pause/speed/scrub/scenario) ·
  `POST /schedule` (smart-scheduling preview/apply) · `GET /finance` (financial rollup) ·
  `POST /compare` (KPI deltas between two saved designs).
- **WebSocket `/stream`:** telemetry frames — always global KPIs + hall/rack aggregates;
  on-demand server/GPU detail when the client subscribes to a drilled-into rack.

**Frontend (React 18 · TypeScript · Vite · React Three Fiber/Three.js · Zustand)**

| Layer | Role |
|---|---|
| Data | WS + REST clients; Zustand store (static model + latest telemetry + UI state) |
| 3D (R3F) | Scene mirrors hierarchy; **instanced meshes**; overlays update instance color **buffers directly** (not React re-render); camera + LOD + raycast picking |
| UI (DOM) | Top KPI bar · left tree + lens toggle · right inspector · bottom time controls + curve · legend · optimize panel · toasts |

**Repo layout (monorepo, local dev)**

```
dc-simulator/
  backend/
    app/
      main.py            # FastAPI app, routes, WS
      config.py          # design/config schema + defaults + location profiles
      generator.py       # parametric DC builder (from a config)
      curves.py          # grid-carbon/source/price curves + scenarios
      models.py          # Pydantic schemas
      sim/
        engine.py        # tick loop
        jobs.py          # arrivals + scheduler
        generation.py    # on-site generation + storage assets
        dispatch.py      # rule-based merit-order dispatch
        physics.py       # thermal/power/carbon/water models
        finance.py       # capex/opex/revenue/payback/baseline compare
        aggregate.py     # roll-up
        schedule.py      # smart-scheduling of deferrable load (taste of L2)
    requirements.txt
  frontend/
    src/
      data/              # ws + rest clients, store
      three/             # scene, instances, overlays, camera, LOD
      ui/
        design/          # design/config panel (entry point)
        finance/         # financial dashboard
        compare/         # scenario compare
        ...              # inspector, controls, legend, KPI bar
      types/             # TS types (mirror Pydantic)
      App.tsx
    package.json
    vite.config.ts
  README.md
  REQUIREMENTS.md        # this document
```

---

## 11. Definition of done (v1 = Layer 1)

v1 is "done" when a user can, locally in a browser:
1. **Configure a build**: location, IT (racks/GPUs/cooling), energy sources + capacities, workload, and financial assumptions.
2. See it rendered in 3D and watch the predicted day simulate (workload + dispatch).
3. Read predicted KPIs across **all four dimensions**: energy, environment, utilization, and finance.
4. Drill from the hall down to an individual GPU (breadcrumb + inspector).
5. Toggle the **Sustainability** and **Financial** lenses and switch overlays (incl. carbon tint).
6. Scrub the 24h timeline and **watch the hall recolor and cost/carbon shift** as grid + on-site generation change.
7. **Compare two designs** side by side (e.g., grid-only vs. solar+battery) and see the KPI deltas across all four dimensions.
8. *(P1)* Toggle smart scheduling and see storage need + carbon drop.

---

## 12. Build milestones (three-layer roadmap)

### Phase 1 — Layer 1: Predict (v1, this spec)
- **M1 — Backend spine (P0):** config + generator + sim engine + physics + curves + REST `/config`,`/model` + WS `/stream`. Verify telemetry via a CLI/log.
- **M2 — Frontend spine (P0):** R3F scene from `/model`, instanced racks, live telemetry wiring, orbit/select, KPI bar.
- **M3 — Drill-down + overlays (P0):** LOD to GPU, breadcrumb, inspector, 5 overlays + lens toggle, carbon tint.
- **M4 — Energy build + dispatch (P0):** on-site generation + storage assets, rule-based dispatch, source-mix ribbon, 24h clock + scrub; the "carbon shift" demo.
- **M5 — Design front-end + finance (P0):** the design/config panel, the financial model + Financial lens (payback, cash flow vs. grid-only baseline).
- **M6 — Compare + flex (P1):** scenario compare, smart-scheduling toggle, scenario presets, events log.
- **M7 — Polish (P2):** cinematic extras, guided tour, perf tuning to 60 fps.

### Phase 2 — Layer 2: Optimize
- Wrap the Layer 1 forward model in a solver (Pyomo / PuLP + HiGHS): the user sets goals + hard caps (carbon, budget, land, reliability); the engine returns the **recommended build + schedule** and the **Pareto frontier**. Replaces the rule-based dispatch and manual design with search.

### Phase 3 — Layer 3: Operate (live)
- Swap the synthetic generator behind the data interface for **real feeds** (DCGM/Redfish telemetry, DCIM/BMS, WattTime / Electricity Maps grid-carbon, LCA/EPD embodied data). Add live monitoring, drift-from-plan, alerts, and live flexibility actions.

---

## 13. Future (beyond the three layers)

- Add the remaining **stakeholder lenses** (executive, customer/tenant, sales) and the full
  **Decommission** lifecycle module.
- **Waste-heat reuse** modeled as a first-class loop (district heating, greenhouses,
  desalination) feeding the financial and carbon credits.
- Multi-facility / **portfolio** view; persistence; auth & multi-tenancy; compliance reporting
  (EED, CSRD, SEC).
- A **marketplace of local models** (per-region grid-carbon, weather, price) so any operator can
  drop in their own site.
