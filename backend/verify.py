"""CLI smoke test for the Clean Compute Engine backend (verifies M1 telemetry)."""
from __future__ import annotations

import json

from app.models import DesignConfig, EnergyBuild
from app.sim import engine as eng


def line(t: str) -> None:
    print("\n" + "=" * 70 + f"\n{t}\n" + "=" * 70)


def main() -> None:
    e = eng.Engine(DesignConfig())
    m = e.model
    line("MODEL")
    print(f"{m.facility.name} @ {m.facility.region} | tier {m.facility.tier} | "
          f"PUE {m.facility.design_pue}")
    print(f"racks={len(m.racks)} servers={len(m.servers)} gpus={m.total_gpus} "
          f"({m.config.it_build.gpu_model}) installed IT={m.installed_it_mw} MW")
    print(f"hall dims {m.hall_dims.x:.1f} x {m.hall_dims.z:.1f} m | "
          f"embodied {m.embodied.total_co2e_t} tCO2e")
    print(f"gen: {[(g.type, g.nameplate_mw) for g in m.gen_sources]} | "
          f"battery {[s.energy_mwh for s in m.storage]} MWh")

    line("FINANCE (grid-only baseline vs design)")
    f = e.finance
    print(f"capex total ${f.capex.total/1e6:.1f}M  annualized ${f.annualized_capex/1e6:.2f}M")
    print(f"net annual ${f.net_annual_cost/1e6:.2f}M  baseline ${f.baseline_net_annual_cost/1e6:.2f}M")
    print(f"annual savings ${f.annual_savings/1e6:.2f}M  payback {f.payback_years} yr  ROI {f.roi}")
    print(f"annual carbon {f.annual_carbon_t} t  water {f.annual_water_ml} ML  "
          f"24/7 clean {f.clean_match_pct}%  $/MWh-compute {f.dollars_per_mwh_compute}")

    line("FRAMES across the day (scrub) — energy dispatch + KPIs")
    print(f"{'hr':>4} {'IT kW':>8} {'PUE':>5} {'CUE':>5} {'%clean':>7} "
          f"{'solar':>6} {'wind':>6} {'gas':>6} {'batt':>7} {'import':>7} {'export':>7} {'$/hr':>8}")
    for hr in [0, 4, 8, 12, 13, 16, 19, 22]:
        e.control.hour = float(hr)
        fr = e.frame()
        en = fr.energy
        batt = en.battery_discharge_mw - en.battery_charge_mw
        print(f"{hr:>4} {fr.kpis.it_kw:>8.0f} {fr.kpis.pue:>5.2f} {fr.kpis.cue:>5.0f} "
              f"{fr.kpis.pct_renewable:>7.1f} {en.solar_mw:>6.1f} {en.wind_mw:>6.1f} "
              f"{en.gas_mw:>6.1f} {batt:>7.1f} {en.grid_import_mw:>7.1f} "
              f"{en.grid_export_mw:>7.1f} {fr.kpis.dollars_per_hr:>8.0f}")

    line("DRILL-DOWN detail (subscribe to rack-000 @ noon)")
    e.control.hour = 12.0
    e.apply_control("subscribe", rack_id="rack-000")
    fr = e.frame()
    print(f"detail rack={fr.detail_rack_id} servers={len(fr.servers)} gpus={len(fr.gpus)}")
    g = fr.gpus[0]
    print(f"gpu[0] {g.id}: {g.power_w}W util={g.util} temp={g.temp_c}C "
          f"mem={g.mem_used_gb}GB idle={g.idle} job={g.job_id}")

    line("SMART SCHEDULING (flexible load)")
    s = eng.compute_schedule(e.config, "normal")
    print(json.dumps(s.model_dump(), indent=2))

    line("SCENARIO COMPARE (grid-only vs solar+battery)")
    a = DesignConfig(name="Grid-only", energy_build=EnergyBuild(
        grid_interconnect_mw=150, solar_mw=0, wind_mw=0, gas_mw=0, nuclear_mw=0,
        battery_mwh=0, battery_mw=0))
    b = DesignConfig(name="Solar + battery")
    _, fa = eng.design_finance(a)
    _, fb = eng.design_finance(b)
    cmp = eng.compare_designs(a.name, fa, b.name, fb)
    for d in cmp.dimensions:
        print(f"  {d.label:<18} {d.a:>14,.1f} -> {d.b:>14,.1f}  "
              f"({d.delta_pct:+.1f}% | better={d.better}) {d.unit}")

    line("VALIDATION")
    assert m.total_gpus > 2000, "expected ~2k+ GPUs"
    assert 0 < f.clean_match_pct <= 100
    assert all(fr is not None for fr in [e.frame()])
    print("OK — telemetry, dispatch, finance, schedule, compare all functional.")


if __name__ == "__main__":
    main()
