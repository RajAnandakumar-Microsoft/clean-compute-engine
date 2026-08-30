"""24-hour environmental curves and scenario presets.

Everything here is deterministic given (location profile, scenario). The curves
drive the source-aware carbon/price/water/thermal behaviour of the sim.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

HOURS = 24


@dataclass
class LocationProfile:
    id: str
    name: str
    solar_peak_cf: float  # midday capacity factor for solar
    wind_mean_cf: float  # average wind capacity factor
    grid_carbon_base: float  # gCO2e/kWh baseline
    grid_carbon_amp: float  # evening-peak amplitude
    price_base: float  # $/kWh baseline
    price_amp: float  # evening-peak amplitude
    ambient_base_c: float  # overnight ambient
    ambient_amp_c: float  # day swing
    water_stress: float  # 0..1, scales WUE penalty


@dataclass
class Curves:
    """All 24-length curves for one (location, scenario)."""

    solar_cf: np.ndarray
    wind_cf: np.ndarray
    grid_carbon: np.ndarray  # gCO2e/kWh
    price: np.ndarray  # $/kWh
    ambient_c: np.ndarray
    water_stress: float


def _diurnal(peak_hour: float, width: float) -> np.ndarray:
    """A normalised 0..1 bell over the day, peaking at ``peak_hour``."""
    h = np.arange(HOURS)
    bell = np.exp(-0.5 * ((h - peak_hour) / width) ** 2)
    return bell / bell.max()


def solar_profile(peak_cf: float) -> np.ndarray:
    h = np.arange(HOURS)
    # zero before ~6am and after ~7pm, bell in between
    day = np.clip(np.sin((h - 6) / 12 * np.pi), 0, None)
    cf = (day**1.3) * peak_cf
    cf[h < 6] = 0.0
    cf[h > 19] = 0.0
    return cf


def wind_profile(mean_cf: float, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed + 7)
    # wind is stronger overnight, plus smooth noise; clipped to [0,1]
    base = mean_cf * (1.15 - 0.3 * _diurnal(14, 5))
    noise = rng.normal(0, 0.06, HOURS)
    # smooth the noise a little
    noise = np.convolve(noise, np.ones(3) / 3, mode="same")
    return np.clip(base + noise, 0.02, 0.95)


def build_curves(profile: LocationProfile, scenario: str, seed: int) -> Curves:
    evening_peak = _diurnal(19, 3.0)  # ramps up late afternoon/evening
    midday_dip = _diurnal(13, 3.5)  # solar pushes grid carbon/price down midday

    grid_carbon = (
        profile.grid_carbon_base
        + profile.grid_carbon_amp * evening_peak
        - 0.35 * profile.grid_carbon_amp * midday_dip
    )
    price = (
        profile.price_base
        + profile.price_amp * evening_peak
        - 0.4 * profile.price_amp * midday_dip
    )
    ambient = profile.ambient_base_c + profile.ambient_amp_c * _diurnal(15, 4.0)
    solar_cf = solar_profile(profile.solar_peak_cf)
    wind_cf = wind_profile(profile.wind_mean_cf, seed)
    water_stress = profile.water_stress

    if scenario == "heatwave":
        ambient = ambient + 12.0  # brutal afternoon heat
        price = price * (1.0 + 0.9 * evening_peak)  # scarcity pricing
        grid_carbon = grid_carbon + 90 * evening_peak  # peaker gas dispatched
        solar_cf = solar_cf * 1.05  # clear skies
        water_stress = min(1.0, water_stress + 0.25)
    elif scenario == "dirty_evening":
        grid_carbon = grid_carbon + 160 * evening_peak + 40
        wind_cf = wind_cf * 0.5  # still, calm evening
        price = price * (1.0 + 0.5 * evening_peak)
    # "normal" leaves the baselines untouched

    grid_carbon = np.clip(grid_carbon, 20, 900)
    price = np.clip(price, 0.02, 2.0)
    return Curves(
        solar_cf=solar_cf,
        wind_cf=wind_cf,
        grid_carbon=grid_carbon,
        price=price,
        ambient_c=ambient,
        water_stress=water_stress,
    )


SCENARIOS = [
    {
        "id": "normal",
        "name": "Normal day",
        "description": "Typical grid, mild weather, solar noon peak.",
    },
    {
        "id": "heatwave",
        "name": "Heat wave",
        "description": "Hot afternoon: cooling load, water and price spike.",
    },
    {
        "id": "dirty_evening",
        "name": "Dirty-grid evening",
        "description": "Calm wind, high evening grid carbon and price.",
    },
]
