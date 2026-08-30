"""Lightweight physical models: workload shape, power, PUE, thermal, water.

Everything is vectorised over the 24-hour day with NumPy and is deterministic
given the config + seeded RNG upstream.
"""

from __future__ import annotations

import numpy as np

from ..config import IDLE_POWER_FRAC
from ..curves import HOURS, Curves
from ..models import DesignConfig


def _diurnal(peak_hour: float, width: float) -> np.ndarray:
    h = np.arange(HOURS)
    bell = np.exp(-0.5 * ((h - peak_hour) / width) ** 2)
    return bell / bell.max()


def workload_util(config: DesignConfig, curves: Curves) -> np.ndarray:
    """Fraction (0..1) of installed IT capacity demanded each hour.

    When smart scheduling is on, the deferrable share is shifted toward the
    cleanest/cheapest hours (more renewables, lower grid carbon + price).
    """
    wl = config.workload
    daily = _diurnal(14, 6.0)
    util = wl.peak_load_frac * (wl.base_load_frac + (1 - wl.base_load_frac) * daily)

    if config.toggles.smart_scheduling and wl.deferrable_frac > 0:
        fixed = util * (1 - wl.deferrable_frac)
        deferrable_energy = float((util * wl.deferrable_frac).sum())
        # cleaner + cheaper + more renewable hours score higher
        clean = 1.0 / (curves.grid_carbon / curves.grid_carbon.mean())
        renew = 0.5 + curves.solar_cf + 0.4 * curves.wind_cf
        cheap = 1.0 / (curves.price / curves.price.mean())
        weight = clean * renew * cheap
        weight = weight / weight.sum()
        util = fixed + deferrable_energy * weight
        util = np.clip(util, 0.0, 1.0)
    return util


def effective_pue(design_pue: float, ambient_c: np.ndarray, cooling: str) -> np.ndarray:
    """PUE rises with ambient heat; liquid cooling is less sensitive than air."""
    sensitivity = 0.004 if cooling == "liquid" else 0.010
    ref = 20.0
    return design_pue + sensitivity * np.clip(ambient_c - ref, 0, None)


def gpu_power_w(active: np.ndarray, util: np.ndarray, tdp_w: np.ndarray) -> np.ndarray:
    """Active GPUs draw up to TDP scaled by util; idle GPUs draw the idle floor."""
    active_draw = tdp_w * (IDLE_POWER_FRAC + (1 - IDLE_POWER_FRAC) * util)
    idle_draw = tdp_w * IDLE_POWER_FRAC
    return np.where(active, active_draw, idle_draw)


def gpu_temp_c(
    active: np.ndarray, util: np.ndarray, ambient_c: np.ndarray, cooling: str
) -> np.ndarray:
    """temp ~ ambient + k*utilisation - cooling headroom, with a hotspot bump."""
    cool = 6.0 if cooling == "liquid" else 2.0
    rise = np.where(active, 30.0 * util + 8.0, 6.0)
    return ambient_c[:, None] + rise - cool


def water_l_s(
    facility_kw: np.ndarray, cooling: str, water_stress: float, ambient_c: np.ndarray
) -> np.ndarray:
    """Evaporative water use scales with cooling load and heat; worse when hot."""
    base_wue = 1.8 if cooling == "air" else 0.35  # L/kWh
    heat_factor = 1.0 + 0.03 * np.clip(ambient_c - 20, 0, None) * (0.5 + water_stress)
    wue = base_wue * heat_factor  # L/kWh
    return facility_kw * wue / 3600.0  # L/s
