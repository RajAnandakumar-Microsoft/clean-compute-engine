"""Design/config helpers: GPU specs, energy-source economics, and location profiles.

These are the reference tables the generator and finance model read from. Values
are realistic-order-of-magnitude, not vendor-exact.
"""

from __future__ import annotations

from .curves import LocationProfile

# --- GPU catalogue: TDP (W), memory (GB), embodied CO2e (kg) -----------------
GPU_SPECS: dict[str, dict] = {
    "H100": {"tdp_w": 700.0, "memory_gb": 80, "embodied_kg": 320.0},
    "GB200": {"tdp_w": 1200.0, "memory_gb": 192, "embodied_kg": 560.0},
    "A100": {"tdp_w": 400.0, "memory_gb": 80, "embodied_kg": 250.0},
    "MI300X": {"tdp_w": 750.0, "memory_gb": 192, "embodied_kg": 400.0},
}

# Per-server overhead beyond the GPUs (CPU, RAM, NICs, PSU) and its embodied cost
SERVER_BASE_POWER_KW = 0.5
SERVER_EMBODIED_KG = 800.0
IDLE_POWER_FRAC = 0.35  # an idle GPU still draws ~35% of TDP

# --- Energy source economics -------------------------------------------------
# capex $/MW, opex $/MWh, lifecycle carbon gCO2e/kWh, water L/MWh, dispatchable
SOURCE_SPECS: dict[str, dict] = {
    "solar": {
        "capex_per_mw": 1_000_000,
        "opex_per_mwh": 8,
        "carbon": 40,
        "water": 5,
        "dispatchable": False,
        "life": 25,
    },
    "wind": {
        "capex_per_mw": 1_300_000,
        "opex_per_mwh": 10,
        "carbon": 11,
        "water": 1,
        "dispatchable": False,
        "life": 25,
    },
    "gas": {
        "capex_per_mw": 1_100_000,
        "opex_per_mwh": 35,
        "carbon": 450,
        "water": 800,
        "dispatchable": True,
        "life": 25,
    },
    "nuclear": {
        "capex_per_mw": 6_500_000,
        "opex_per_mwh": 12,
        "carbon": 12,
        "water": 2000,
        "dispatchable": True,
        "life": 40,
    },
}
BATTERY_CAPEX_PER_MWH = 250_000
BATTERY_OPEX_PER_MWH = 2.0
BATTERY_ROUND_TRIP = 0.88
BATTERY_CYCLE_LIFE = 6000
FACILITY_CAPEX_PER_MW = 9_000_000  # shell, power, cooling per MW of IT

# --- Location profiles -------------------------------------------------------
LOCATIONS: dict[str, LocationProfile] = {
    "az-desert": LocationProfile(
        id="az-desert",
        name="Arizona desert",
        solar_peak_cf=0.82,
        wind_mean_cf=0.22,
        grid_carbon_base=380,
        grid_carbon_amp=140,
        price_base=0.075,
        price_amp=0.09,
        ambient_base_c=22,
        ambient_amp_c=16,
        water_stress=0.85,
    ),
    "tx-plains": LocationProfile(
        id="tx-plains",
        name="Texas plains (ERCOT)",
        solar_peak_cf=0.70,
        wind_mean_cf=0.42,
        grid_carbon_base=410,
        grid_carbon_amp=120,
        price_base=0.065,
        price_amp=0.11,
        ambient_base_c=20,
        ambient_amp_c=13,
        water_stress=0.55,
    ),
    "va-loudoun": LocationProfile(
        id="va-loudoun",
        name="Virginia (PJM / Data Center Alley)",
        solar_peak_cf=0.55,
        wind_mean_cf=0.20,
        grid_carbon_base=360,
        grid_carbon_amp=150,
        price_base=0.088,
        price_amp=0.10,
        ambient_base_c=14,
        ambient_amp_c=11,
        water_stress=0.40,
    ),
    "pnw-hydro": LocationProfile(
        id="pnw-hydro",
        name="Pacific NW (hydro grid)",
        solar_peak_cf=0.48,
        wind_mean_cf=0.30,
        grid_carbon_base=110,
        grid_carbon_amp=60,
        price_base=0.055,
        price_amp=0.05,
        ambient_base_c=10,
        ambient_amp_c=9,
        water_stress=0.20,
    ),
    "nordic": LocationProfile(
        id="nordic",
        name="Nordic (cold + wind)",
        solar_peak_cf=0.35,
        wind_mean_cf=0.48,
        grid_carbon_base=60,
        grid_carbon_amp=40,
        price_base=0.060,
        price_amp=0.06,
        ambient_base_c=4,
        ambient_amp_c=8,
        water_stress=0.15,
    ),
}


def location_list() -> list[dict]:
    return [{"id": p.id, "name": p.name} for p in LOCATIONS.values()]


def get_location(location_id: str) -> LocationProfile:
    return LOCATIONS.get(location_id, LOCATIONS["az-desert"])
