"""Financial model: capex, opex, energy cost, revenue/credits, payback vs a
grid-only baseline, NPV and cumulative cash flow. This is the Financial lens.
"""

from __future__ import annotations

from .. import config as cfg
from ..models import CapexBreakdown, DCModel, DesignConfig, FinanceReport

GPU_PRICE = {"H100": 30000.0, "GB200": 65000.0, "A100": 12000.0, "MI300X": 18000.0}
SERVER_OVERHEAD_PRICE = 8000.0
MAINT_FRAC_OF_IT = 0.03  # annual maintenance as fraction of IT capex
WATER_PRICE_PER_L = 0.0018  # $/L (~$1.8/m3)
HEAT_RECOVERABLE_FRAC = 0.30
DAYS = 365


def _crf(rate: float, life: int) -> float:
    """Capital-recovery factor: turns a lump capex into an annual payment."""
    if rate <= 0:
        return 1.0 / life
    f = (1 + rate) ** life
    return rate * f / (f - 1)


def compute_finance(model: DCModel, config: DesignConfig, daily: dict) -> FinanceReport:
    fin = config.finance
    r = fin.discount_rate
    it = config.it_build
    eb = config.energy_build

    # --- capex ---
    it_hw = (
        model.total_gpus * GPU_PRICE[it.gpu_model]
        + len(model.servers) * SERVER_OVERHEAD_PRICE
    )
    solar_cx = eb.solar_mw * cfg.SOURCE_SPECS["solar"]["capex_per_mw"]
    wind_cx = eb.wind_mw * cfg.SOURCE_SPECS["wind"]["capex_per_mw"]
    gas_cx = eb.gas_mw * cfg.SOURCE_SPECS["gas"]["capex_per_mw"]
    nuclear_cx = eb.nuclear_mw * cfg.SOURCE_SPECS["nuclear"]["capex_per_mw"]
    battery_cx = eb.battery_mwh * cfg.BATTERY_CAPEX_PER_MWH
    facility_cx = model.installed_it_mw * cfg.FACILITY_CAPEX_PER_MW
    total_cx = (
        it_hw + solar_cx + wind_cx + gas_cx + nuclear_cx + battery_cx + facility_cx
    )

    capex = CapexBreakdown(
        it_hardware=round(it_hw),
        solar=round(solar_cx),
        wind=round(wind_cx),
        gas=round(gas_cx),
        nuclear=round(nuclear_cx),
        battery=round(battery_cx),
        facility=round(facility_cx),
        total=round(total_cx),
    )

    # --- annualised capex (per-asset life) ---
    ann_capex = (
        it_hw * _crf(r, 6)
        + facility_cx * _crf(r, 25)
        + solar_cx * _crf(r, 25)
        + wind_cx * _crf(r, 25)
        + gas_cx * _crf(r, 25)
        + nuclear_cx * _crf(r, 40)
        + battery_cx * _crf(r, 10)
    )

    # --- annual energy accounting (daily -> yearly) ---
    it_mwh_y = daily["it_mwh"] * DAYS
    fac_mwh_y = daily["served_mwh"] * DAYS
    import_mwh_y = daily["grid_import_mwh"] * DAYS
    export_mwh_y = daily["grid_export_mwh"] * DAYS
    gen_mwh = {k: daily[f"{k}_mwh"] * DAYS for k in ("solar", "wind", "gas", "nuclear")}
    bat_throughput_y = daily["battery_throughput_mwh"] * DAYS
    water_l_y = daily["water_l"] * DAYS

    # --- opex ---
    gen_opex = sum(gen_mwh[k] * cfg.SOURCE_SPECS[k]["opex_per_mwh"] for k in gen_mwh)
    battery_opex = bat_throughput_y * cfg.BATTERY_OPEX_PER_MWH
    maintenance = it_hw * MAINT_FRAC_OF_IT
    water_cost = water_l_y * WATER_PRICE_PER_L
    opex = gen_opex + battery_opex + maintenance + water_cost

    # --- energy cost (grid) ---
    energy_cost = (
        import_mwh_y * 1000 * fin.import_price - export_mwh_y * 1000 * fin.export_price
    )

    # --- revenue / credits ---
    flexible_mw = (
        config.workload.deferrable_frac
        * model.installed_it_mw
        * model.facility.design_pue
    )
    offered_mw = eb.battery_mw + eb.gas_mw + eb.nuclear_mw + flexible_mw
    grid_services = offered_mw * fin.grid_services_per_mw_yr
    heat_credit = it_mwh_y * 1000 * HEAT_RECOVERABLE_FRAC * fin.heat_reuse_value

    net_annual = ann_capex + opex + energy_cost - grid_services - heat_credit

    # --- grid-only baseline (same IT + facility, imports everything) ---
    base_capex = it_hw + facility_cx
    base_ann_capex = it_hw * _crf(r, 6) + facility_cx * _crf(r, 25)
    base_energy_cost = fac_mwh_y * 1000 * fin.import_price
    base_opex = maintenance + water_cost
    base_heat_credit = heat_credit  # heat reuse is source-independent, credit both
    base_net_annual = base_ann_capex + base_opex + base_energy_cost - base_heat_credit

    annual_savings = base_net_annual - net_annual
    incremental_capex = total_cx - base_capex
    payback = (
        incremental_capex / annual_savings
        if annual_savings > 0 and incremental_capex > 0
        else None
    )

    horizon = fin.horizon_years
    cash_flow = [
        round(-incremental_capex + annual_savings * t) for t in range(horizon + 1)
    ]
    npv = (
        sum(annual_savings / (1 + r) ** t for t in range(1, horizon + 1))
        - incremental_capex
    )
    roi = (
        (annual_savings * horizon - incremental_capex) / incremental_capex
        if incremental_capex > 0
        else 0.0
    )

    return FinanceReport(
        capex=capex,
        annualized_capex=round(ann_capex),
        opex=round(opex),
        energy_cost=round(energy_cost),
        grid_services_revenue=round(grid_services),
        heat_reuse_credit=round(heat_credit),
        net_annual_cost=round(net_annual),
        baseline_net_annual_cost=round(base_net_annual),
        annual_savings=round(annual_savings),
        payback_years=round(payback, 2) if payback else None,
        roi=round(roi, 3),
        npv=round(npv),
        dollars_per_mwh_compute=round(net_annual / max(it_mwh_y, 1e-6), 2),
        cash_flow=cash_flow,
        annual_energy_mwh=round(fac_mwh_y),
        annual_carbon_t=round(daily["carbon_t"] * DAYS),
        annual_water_ml=round(water_l_y / 1e6, 2),
        clean_match_pct=round(
            daily["clean_mwh"] / max(daily["served_mwh"], 1e-6) * 100, 1
        ),
    )
