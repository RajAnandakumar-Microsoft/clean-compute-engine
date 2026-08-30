"""Roll telemetry up the hierarchy: GPU -> rack -> hall -> facility.

Operates on precomputed (24 x N) NumPy arrays and returns (24 x R) rack arrays
and (24,) facility/hall arrays. Called once when a timeline is built.
"""

from __future__ import annotations

import numpy as np

from ..config import SERVER_BASE_POWER_KW


def rack_rollup(
    gpu_power_w: np.ndarray,
    gpu_util: np.ndarray,
    gpu_temp: np.ndarray,
    gpu_active: np.ndarray,
    rack_of_gpu: np.ndarray,
    n_racks: int,
    servers_per_rack: int,
    ambient_c: np.ndarray,
) -> dict[str, np.ndarray]:
    hours = gpu_power_w.shape[0]
    rack_power = np.zeros((hours, n_racks))
    rack_util = np.zeros((hours, n_racks))
    rack_outlet = np.zeros((hours, n_racks))
    gpus_per_rack = np.bincount(rack_of_gpu, minlength=n_racks).astype(float)
    gpus_per_rack[gpus_per_rack == 0] = 1.0

    for h in range(hours):
        rack_power[h] = (
            np.bincount(rack_of_gpu, weights=gpu_power_w[h], minlength=n_racks) / 1000.0
        )
        rack_power[h] += servers_per_rack * SERVER_BASE_POWER_KW
        rack_util[h] = (
            np.bincount(rack_of_gpu, weights=gpu_util[h], minlength=n_racks)
            / gpus_per_rack
        )
        rack_outlet[h] = (
            np.bincount(rack_of_gpu, weights=gpu_temp[h], minlength=n_racks)
            / gpus_per_rack
        )

    rack_inlet = np.repeat(ambient_c[:, None], n_racks, axis=1)
    return {
        "power_kw": rack_power,
        "util": rack_util,
        "outlet_c": rack_outlet,
        "inlet_c": rack_inlet,
        "delta_t": rack_outlet - rack_inlet,
    }


def hall_rollup(rack: dict[str, np.ndarray]) -> dict[str, np.ndarray]:
    power = rack["power_kw"]
    util = rack["util"]
    outlet = rack["outlet_c"]
    return {
        "it_kw": power.sum(axis=1),
        "util": util.mean(axis=1),
        "avg_temp": outlet.mean(axis=1),
        "max_temp": outlet.max(axis=1),
        "active_racks": (util > 0.05).sum(axis=1).astype(float),
    }
