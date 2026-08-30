"""Parametric data-center generator.

Turns a DesignConfig into a full static topology (facility -> hall -> rack ->
server -> GPU) plus on-site generation, storage and grid assets, with 3D
positions for the client and embodied-carbon accounting.
"""

from __future__ import annotations

from . import config as cfg
from .models import (
    DCModel,
    DesignConfig,
    EmbodiedSummary,
    FacilityStatic,
    GenSourceStatic,
    GpuStatic,
    GridStatic,
    HallStatic,
    RackStatic,
    ServerStatic,
    StorageStatic,
    Vec3,
)

# physical layout (metres)
RACK_W = 0.6
RACK_D = 1.2
RACK_H = 2.1
COL_PITCH = 0.75
ROW_PITCH = RACK_D + 1.4  # rack depth + hot/cold aisle
PEAK_HOURS = [17, 18, 19, 20]


def _grid_shape(n: int) -> tuple[int, int]:
    """Arrange n racks into rows x cols, a little wider than deep."""
    cols = max(1, round((n * 1.8) ** 0.5))
    rows = -(-n // cols)  # ceil
    return rows, cols


def build_model(config: DesignConfig) -> DCModel:
    it = config.it_build
    gpu_spec = cfg.GPU_SPECS[it.gpu_model]
    commissioned = 2025

    rows, cols = _grid_shape(it.rack_count)
    hall_w = cols * COL_PITCH
    hall_d = rows * ROW_PITCH
    design_pue = 1.15 if it.cooling == "liquid" else 1.42

    racks: list[RackStatic] = []
    servers: list[ServerStatic] = []
    gpus: list[GpuStatic] = []

    server_kw = (
        it.gpus_per_server * gpu_spec["tdp_w"] / 1000.0 + cfg.SERVER_BASE_POWER_KW
    )

    for r in range(it.rack_count):
        row, col = divmod(r, cols)
        # centre the grid on origin
        x = (col - (cols - 1) / 2) * COL_PITCH
        z = (row - (rows - 1) / 2) * ROW_PITCH
        rack_id = f"rack-{r:03d}"
        racks.append(
            RackStatic(
                id=rack_id,
                hall_id="hall-0",
                row=row,
                col=col,
                u_height=48,
                breaker_kw=it.design_density_kw,
                cooling=it.cooling,
                pos=Vec3(x=x, y=RACK_H / 2, z=z),
            )
        )
        for s in range(it.servers_per_rack):
            server_id = f"{rack_id}-srv-{s:02d}"
            sy = (s + 0.5) / it.servers_per_rack * RACK_H
            servers.append(
                ServerStatic(
                    id=server_id,
                    rack_id=rack_id,
                    u_slot=s * (48 // it.servers_per_rack),
                    model=f"{it.gpu_model}x{it.gpus_per_server}",
                    gpu_count=it.gpus_per_server,
                    rated_power_kw=server_kw,
                    embodied_co2e_kg=cfg.SERVER_EMBODIED_KG,
                    install_year=commissioned,
                    useful_life_yr=6,
                    pos=Vec3(x=x, y=sy, z=z),
                )
            )
            for g in range(it.gpus_per_server):
                gx = x + (g - (it.gpus_per_server - 1) / 2) * (
                    RACK_W / it.gpus_per_server
                )
                gpus.append(
                    GpuStatic(
                        id=f"{server_id}-gpu-{g}",
                        server_id=server_id,
                        rack_id=rack_id,
                        model=it.gpu_model,
                        tdp_w=gpu_spec["tdp_w"],
                        memory_gb=gpu_spec["memory_gb"],
                        embodied_co2e_kg=gpu_spec["embodied_kg"],
                        install_year=commissioned,
                        useful_life_yr=6,
                        pos=Vec3(x=gx, y=sy, z=z),
                    )
                )

    total_gpus = len(gpus)
    installed_it_mw = (total_gpus * gpu_spec["tdp_w"] / 1e6) + (
        len(servers) * cfg.SERVER_BASE_POWER_KW / 1e3
    )

    # embodied carbon (tonnes)
    gpu_co2e_t = sum(g.embodied_co2e_kg for g in gpus) / 1000.0
    server_co2e_t = sum(s.embodied_co2e_kg for s in servers) / 1000.0

    facility = FacilityStatic(
        id="fac-0",
        name=config.name,
        region=cfg.get_location(config.location).name,
        grid_region=config.location,
        climate_zone=config.location,
        tier=3,
        power_capacity_mw=round(installed_it_mw * design_pue * 1.25, 1),
        design_pue=design_pue,
        water_source="municipal + on-site",
        commissioned_year=commissioned,
    )
    hall = HallStatic(
        id="hall-0",
        facility_id="fac-0",
        name="Hall A",
        area_m2=round(hall_w * hall_d, 1),
        rack_capacity=it.rack_count,
        cooling=it.cooling,
        design_density_kw=it.design_density_kw,
    )

    # generation + storage + grid
    eb = config.energy_build
    gen_sources: list[GenSourceStatic] = []
    for stype, mw in (
        ("solar", eb.solar_mw),
        ("wind", eb.wind_mw),
        ("gas", eb.gas_mw),
        ("nuclear", eb.nuclear_mw),
    ):
        if mw <= 0:
            continue
        spec = cfg.SOURCE_SPECS[stype]
        gen_sources.append(
            GenSourceStatic(
                id=f"gen-{stype}",
                type=stype,
                nameplate_mw=mw,
                capex_per_mw=spec["capex_per_mw"],
                opex_per_mwh=spec["opex_per_mwh"],
                carbon_g_per_kwh=spec["carbon"],
                water_l_per_mwh=spec["water"],
                dispatchable=spec["dispatchable"],
            )
        )
    storage: list[StorageStatic] = []
    if eb.battery_mwh > 0 and eb.battery_mw > 0:
        storage.append(
            StorageStatic(
                id="bat-0",
                energy_mwh=eb.battery_mwh,
                power_mw=eb.battery_mw,
                round_trip_eff=cfg.BATTERY_ROUND_TRIP,
                capex_per_mwh=cfg.BATTERY_CAPEX_PER_MWH,
                opex_per_mwh=cfg.BATTERY_OPEX_PER_MWH,
                cycle_life=cfg.BATTERY_CYCLE_LIFE,
            )
        )
    grid = GridStatic(
        interconnect_mw=eb.grid_interconnect_mw,
        import_price=config.finance.import_price,
        export_price=config.finance.export_price,
        peak_hours=PEAK_HOURS,
    )

    return DCModel(
        config=config,
        facility=facility,
        halls=[hall],
        racks=racks,
        servers=servers,
        gpus=gpus,
        gen_sources=gen_sources,
        storage=storage,
        grid=grid,
        embodied=EmbodiedSummary(
            gpu_co2e_t=round(gpu_co2e_t, 1),
            server_co2e_t=round(server_co2e_t, 1),
            total_co2e_t=round(gpu_co2e_t + server_co2e_t, 1),
        ),
        hall_dims=Vec3(x=hall_w, y=RACK_H, z=hall_d),
        total_gpus=total_gpus,
        installed_it_mw=round(installed_it_mw, 3),
    )
