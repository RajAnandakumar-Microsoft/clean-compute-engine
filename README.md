# The Clean Compute Engine

> [!IMPORTANT]
> This is an independent research project. It is not an official Microsoft
> project, product, or research initiative, and Microsoft has not reviewed,
> sponsored, endorsed, or approved it. No Microsoft confidential or operational
> data is included. It was created as an independent participant project for the
> Microsoft Global Hackathon; participation does not imply endorsement.

A **public research project** about how data centers can grow with less
environmental harm.

## Research thesis

> We can grow AI infrastructure with less environmental harm by designing
> data centers and their energy supply as one connected system.

This is the thesis to investigate, not an established result. The goal is to
create a **world prediction model** that helps us understand how location,
computing, cooling, and energy choices shape a data center's impact over
time, so we can explore better decisions before we build.

## The world model we want to create

Here, a world model means a connected model of how computing demand, facility
behavior, and energy supply evolve together. The 3D world makes those
relationships understandable; the prediction and physical-accounting models
underneath must eventually be calibrated and evaluated against evidence.

Forecasting consumption is one part of the problem. The other is how
renewable generation, storage, grid access, and permitted workload scheduling
can meet that demand while exposing carbon, water, cost, and service
trade-offs.

| Layer | Purpose | Current boundary |
|---|---|---|
| Predict | Explore a specified buildout and energy-system plan | Working synthetic scenario evaluator |
| Optimize | Find feasible portfolios and schedules under explicit objectives and constraints | Research direction; no optimizer or optimality claim |
| Operate | Compare actual operation with an approved plan | Future work; no live facility integration |

The [research contract](research/RESEARCH-CONTRACT.md) turns this vision into
formal questions, hypotheses, and evidence gates.

## Where the project stands

| Boundary | Current state |
|---|---|
| Research stage | **R0 - synthetic prototype** |
| Forecast status | **Uncalibrated; not validated for site decisions** |
| Operational data | **None incorporated** |
| Renewable coupling | **Synthetic physical-portfolio comparison; not an optimizer** |
| Repository visibility | **Public** |
| External sponsorship | **None** |
| Project license | **Apache-2.0** |

The repository contains the demonstrator, research protocol, data contracts,
synthetic examples, and contribution workflow. It contains no empirical
accuracy result or trained model. The independent hackathon project is a way
to demonstrate the architecture and seek a bounded research pilot, not to
claim a validated product.

## Explore the prototype

### Integrated 3D Engine - local, API-backed

Run the local app at `/`. The **Overview, Design, Energy, Water, Compute, and
Compare** tabs share one scenario and clock. Select assets, edit assumptions,
inspect hourly flows, and compare the proposed portfolio with a grid-only
baseline. `/energy` is a deep link into this same Engine.

The evaluator connects phased demand with solar, wind, hydro, optional
nuclear/gas, storage, and bounded work deferral. It exposes shortages rather
than counting unserved computing as carbon savings. Cooling-water
requirements and hydro net consumption are separate synthetic quantities,
not a complete or validated water footprint.

Compute geometry is schematic: the coupled model produces facility-level
values, not per-GPU telemetry. The original 24-hour equipment sandbox remains
available at `/legacy` as a separately labeled experience.

Implementation, dispatch, accounting, and UI details live in the
[coupling specification](research/RENEWABLE-COUPLING.md), rather than in this
overview.

This workspace is **not hosted by GitHub Pages**.

### Public voxel story - browser-only

The five-chapter synthetic story is published through GitHub Pages:

<https://rajanandakumar-microsoft.github.io/clean-compute-engine/>

The story illustrates buildout, workload, cooling, time, uncertainty, and
baseline comparison. It does not expose the full renewable-portfolio
evaluator. Its later chapters use 60 precomputed synthetic outcomes, not a
hosted forecast API. It supports phones and includes no operational data.

## Research still required

Two evidence workstreams need to meet: **facility demand and cooling**, and
**generation, storage, grid constraints, and permitted scheduling**.
Demand calibration and physical coupling can progress in parallel, but
joining unrelated datasets does not establish a real facility's performance.

The next steps are to qualify data and system boundaries, freeze independent
experiments, calibrate components, and evaluate both demand accuracy and
energy-strategy usefulness. Water and optimization claims require their own
evidence. The [pilot proposal](research/DATA-PILOT-PROPOSAL.md) describes the
two workstreams; the [roadmap](BACKLOG.md) tracks the remaining work.

Restricted telemetry, row-level derivatives, site-specific parameters, and
unreviewed model artifacts must remain in an approved controlled environment.
This public Git repository contains only code, schemas, synthetic examples,
methodology, and release-approved artifacts.

## Research reading guide

| Your question | Start here |
|---|---|
| How does the research fit together? | [Research index and document map](research/README.md) |
| What are the hypotheses and evidence gates? | [Research contract](research/RESEARCH-CONTRACT.md) |
| What does the current demand model do? | [Forecast model card](FORECAST-MODEL-CARD.md) |
| How does the energy-system evaluator work? | [Coupling specification](research/RENEWABLE-COUPLING.md) |
| What can I contribute safely? | [Contribution guide](CONTRIBUTING.md) |

The [original product exploration](REQUIREMENTS.md) is historical context,
not current requirements, research evidence, or a source of approved claims.

## Run the demonstrator

Two terminals.

**1. Backend** (http://127.0.0.1:8000)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

**2. Frontend** (http://localhost:5173)
```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 for the integrated Engine,
http://localhost:5173/legacy for the earlier equipment sandbox, or
http://localhost:5173/story for the interactive story. The Vite dev server
proxies REST + WebSocket to the backend.

### Forecast API

- `GET /forecast/metadata` - supported profiles and model status
- `GET /forecast/example` - complete scenario and baseline request
- `POST /forecast` - run a reproducible forecast

The default paired 10-year run uses 250 paths and usually completes in several
seconds on a development laptop.

### Energy coupling API

- `GET /coupling/example` - synthetic demand, supply, grid, flexibility, and water assumptions
- `POST /coupling/evaluate` - paired physical portfolio versus grid-only comparison

The default is one year and 48 paths. Coupling and forecast calls share a
single CPU-run limit. This remains a local, single-user research prototype.

### Tests

Install each package once:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest --cov --cov-config=.coveragerc

cd ..\e2e
npm ci
```

With the backend and frontend development servers running, execute:

```powershell
cd e2e
$env:APP_URL="http://127.0.0.1:5173/"
npm test
```

This runs the legacy forecast, five-chapter story, and integrated world
workflows, including linked asset selection, tabs, time, drafts, and comparisons.

### Regenerate the public story catalog

After changing forecast or story assumptions:

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.research.export_story_outcomes
```

### Quick backend check (no browser)
```powershell
cd backend
.\.venv\Scripts\python.exe verify.py
```
Prints the model, finance report, a scrub across the day, drill-down detail,
smart-scheduling delta, and a scenario compare.

## Repository layout

```
clean-compute-engine/
  .github/            research-aware pull-request checklist
  LICENSE              Apache License 2.0
  DISCLAIMER.md        independence and non-endorsement statement
  SECURITY.md          private vulnerability-reporting policy
  backend/app/
    main.py         REST + WebSocket
    config.py       GPU/source specs + location profiles
    curves.py       24h grid-carbon / capacity-factor / price curves + scenarios
    generator.py    parametric DC builder (facility→hall→rack→server→GPU)
    models.py       legacy Pydantic schemas mirrored in frontend types
    sim/
      physics.py    workload, power, PUE, thermal, water
      jobs.py       per-hour GPU activity (pack/spread placement)
      generation.py on-site source output profiles
      dispatch.py   merit-order dispatch (renewables→storage→dispatchable→grid)
      finance.py    capex/opex/revenue/payback/NPV + grid-only baseline
      aggregate.py  GPU→rack→hall→facility roll-ups
      engine.py     24h timeline + control state + frame assembly
    forecast/       uncalibrated multi-year probabilistic engine
    energy/         chronological physical supply, storage, flexibility, and water
    research/       governed Pydantic data and experiment contracts
  data/
    schemas/        generated JSON Schemas
    synthetic/      hand-authored contract examples only
  experiments/      frozen experiment manifests and workflow
  frontend/
    public/story-data/ generated synthetic outcomes for the static story
    src/
      data/         REST + WS clients, Zustand store
      energy/       shared scenario controls, results, and hourly supply charts
      world/        integrated campus, shared hourly state, tabs, and asset context
      three/        scene, instanced racks, drill-down, overlays, palette
      story/        guided voxel world, decisions, forecast bridge, story UI
      ui/           top bar, tree, inspector, time controls, design/finance/compare
      types/        TS mirror of the Pydantic schemas
  research/         protocol, pilot, governance, evidence, and provenance
```

## Contributing

Contributions to the simulator, model, research protocol, data contracts, and
evaluation framework are welcome. Start with
[`CONTRIBUTING.md`](CONTRIBUTING.md), preserve the evidence boundaries in the
model card, and never submit restricted operational data.

Use GitHub issues for reproducible software defects and research proposals,
Discussions for open-ended design questions, and the private process in
[`SECURITY.md`](SECURITY.md) for vulnerabilities or sensitive-data incidents.

## Current limitations

The repository does not yet contain calibrated parameters, empirical accuracy
results, cross-site validation, validated water prediction, an optimizer,
live facility connectors, restricted-data infrastructure, or trained model weights.
See [`BACKLOG.md`](BACKLOG.md) for the research-first roadmap and
[`CONTRIBUTING.md`](CONTRIBUTING.md) before making changes.
