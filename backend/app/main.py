"""FastAPI app: REST control plane + WebSocket telemetry stream.

Single-session, local-only (Layer 1 POC). One live Engine holds the current
design + control state; the WebSocket advances sim-time and streams frames.
"""

from __future__ import annotations

import asyncio
import contextlib

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import location_list
from .curves import SCENARIOS
from .forecast.assumptions import example_request, forecast_metadata
from .forecast.engine import run_forecast
from .forecast.models import (
    ForecastMetadata,
    ForecastResult,
    ForecastRunRequest,
)
from .models import (
    BuildResponse,
    CompareResult,
    ControlCommand,
    ControlState,
    DCModel,
    DesignConfig,
    FinanceReport,
    LifetimeReport,
    ScheduleRequest,
    ScheduleResult,
)
from .sim import engine as eng

app = FastAPI(title="The Clean Compute Engine", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:4173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://localhost:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

ENGINE = eng.Engine(DesignConfig())
FORECAST_LOCK = asyncio.Lock()

TICK_SECONDS = 0.1
SIM_HOURS_PER_TICK_AT_1X = 0.02  # 1x => full day in ~120s; 60x => ~2s


@app.get("/")
def health() -> dict:
    return {
        "ok": True,
        "product": "The Clean Compute Engine",
        "layer": 1,
        "version": "0.1.0",
        "legacy_simulator": "v0.0.1",
        "gpus": ENGINE.model.total_gpus,
    }


@app.get("/locations")
def locations() -> list[dict]:
    return location_list()


@app.get("/scenarios")
def scenarios() -> list[dict]:
    return SCENARIOS


@app.get("/curves")
def curves() -> dict:
    return ENGINE.curve_data()


@app.get("/model", response_model=DCModel)
def get_model() -> DCModel:
    return ENGINE.model


@app.get("/finance", response_model=FinanceReport)
def get_finance() -> FinanceReport:
    return ENGINE.finance


@app.get("/lifetime", response_model=LifetimeReport)
def get_lifetime() -> LifetimeReport:
    return eng.lifetime_projection(ENGINE.config)


@app.get("/forecast/metadata", response_model=ForecastMetadata)
async def get_forecast_metadata() -> ForecastMetadata:
    return forecast_metadata()


@app.get("/forecast/example", response_model=ForecastRunRequest)
async def get_forecast_example() -> ForecastRunRequest:
    return example_request()


@app.post("/forecast", response_model=ForecastResult)
async def post_forecast(request: ForecastRunRequest) -> ForecastResult:
    if FORECAST_LOCK.locked():
        raise HTTPException(
            status_code=429,
            detail="A forecast is already running; retry after it completes.",
        )
    async with FORECAST_LOCK:
        return await asyncio.to_thread(run_forecast, request)


@app.get("/control", response_model=ControlState)
def get_control() -> ControlState:
    return ENGINE.control


@app.post("/config", response_model=BuildResponse)
def post_config(config: DesignConfig) -> BuildResponse:
    ENGINE.set_config(config)
    return BuildResponse(
        ok=True, model=ENGINE.model, finance=ENGINE.finance, control=ENGINE.control
    )


@app.post("/control", response_model=ControlState)
def post_control(cmd: ControlCommand) -> ControlState:
    ENGINE.apply_control(
        cmd.action,
        speed=cmd.speed,
        hour=cmd.hour,
        scenario=cmd.scenario,
        rack_id=cmd.rack_id,
    )
    return ENGINE.control


@app.post("/schedule", response_model=ScheduleResult)
def post_schedule(req: ScheduleRequest) -> ScheduleResult:
    result = eng.compute_schedule(ENGINE.config, ENGINE.control.scenario)
    ENGINE.config.toggles.smart_scheduling = req.enabled
    ENGINE.set_config(ENGINE.config)
    result.enabled = req.enabled
    return result


@app.post("/compare", response_model=CompareResult)
def post_compare(payload: dict) -> CompareResult:
    a = DesignConfig(**payload["a"])
    b = DesignConfig(**payload["b"])
    _, fin_a = eng.design_finance(a)
    _, fin_b = eng.design_finance(b)
    return eng.compare_designs(a.name, fin_a, b.name, fin_b)


@app.websocket("/stream")
async def stream(ws: WebSocket) -> None:
    await ws.accept()

    async def receiver() -> None:
        try:
            while True:
                msg = await ws.receive_json()
                ENGINE.apply_control(
                    msg.get("action", ""),
                    speed=msg.get("speed"),
                    hour=msg.get("hour"),
                    scenario=msg.get("scenario"),
                    rack_id=msg.get("rack_id"),
                )
        except (WebSocketDisconnect, RuntimeError):
            return

    recv_task = asyncio.create_task(receiver())
    try:
        while True:
            ENGINE.advance(ENGINE.control.speed * SIM_HOURS_PER_TICK_AT_1X)
            await ws.send_text(ENGINE.frame().model_dump_json())
            await asyncio.sleep(TICK_SECONDS)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        recv_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await recv_task
