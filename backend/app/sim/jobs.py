"""Job arrivals and placement.

Produces a deterministic (seeded) 24 x N activity matrix: which GPUs are busy
each hour, and how hard. The aggregate follows the workload utilisation curve;
placement (pack vs spread) controls how the load is distributed across racks,
which is what makes stranded capacity visible in the 3D view.
"""

from __future__ import annotations

import numpy as np

from .physics import HOURS


def activity_matrix(
    n_gpus: int, util_frac: np.ndarray, placement: str, seed: int
) -> tuple[np.ndarray, np.ndarray]:
    """Return (active[24,N] bool, util[24,N] float in 0..1)."""
    rng = np.random.default_rng(seed)
    idx = np.arange(n_gpus)
    active = np.zeros((HOURS, n_gpus), dtype=bool)

    for h in range(HOURS):
        k = int(round(float(util_frac[h]) * n_gpus))
        k = max(0, min(n_gpus, k))
        if k == 0:
            continue
        if placement == "spread":
            # even, pseudo-random distribution across all racks, drifting per hour
            rank = (idx * 2654435761 + h * 40503) % n_gpus
            active[h] = rank < k
        else:  # pack: contiguous block (fills whole racks), rotating over the day
            offset = (h * max(1, n_gpus // 24)) % n_gpus
            active[h] = ((idx - offset) % n_gpus) < k

    # per-GPU utilisation when active: heavy but noisy; idle GPUs at 0
    noise = rng.uniform(0.90, 0.99, size=(HOURS, n_gpus))
    util = np.where(active, noise, 0.0)
    return active, util
