"""On-site generation and storage as first-class, time-varying assets."""

from __future__ import annotations

import numpy as np

from ..curves import Curves
from ..models import DCModel


def source_outputs(model: DCModel, curves: Curves) -> dict[str, np.ndarray]:
    """Per-hour available MW from each on-site source.

    Renewables follow their capacity-factor curves; dispatchables report their
    full nameplate as *available* capacity (dispatch decides how much to run).
    """
    out: dict[str, np.ndarray] = {}
    for gs in model.gen_sources:
        if gs.type == "solar":
            out["solar"] = gs.nameplate_mw * curves.solar_cf
        elif gs.type == "wind":
            out["wind"] = gs.nameplate_mw * curves.wind_cf
        elif gs.type == "gas":
            out["gas_cap"] = np.full(24, gs.nameplate_mw)
        elif gs.type == "nuclear":
            # nuclear runs as steady baseload
            out["nuclear"] = np.full(24, gs.nameplate_mw * 0.95)
    return out
