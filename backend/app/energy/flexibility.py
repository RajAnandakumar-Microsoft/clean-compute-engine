"""A bounded, perfect-foresight work-deferral heuristic, not an optimizer."""

from __future__ import annotations

import numpy as np

from ..forecast.engine import FloatArray, PhaseHours
from .models import WorkFlexibility


def defer_work(
    phases: list[PhaseHours],
    score: FloatArray,
    flexibility: WorkFlexibility,
) -> tuple[list[PhaseHours], FloatArray]:
    """Defer original work to cleaner future hours while preserving daily work.

    Original flexible arrivals are tracked separately from deferred arrivals:
    moving an incoming job again would silently extend its allowed deadline.
    All remaining work stays at its original hour if no better feasible slot exists.
    """
    sample_count, hour_count = score.shape
    shifted = np.zeros((sample_count, hour_count))
    if flexibility.fraction == 0.0:
        return phases, shifted
    daily_score = score.reshape(-1, 24)
    rows = np.arange(daily_score.shape[0])
    scheduled: list[PhaseHours] = []
    for phase in phases:
        original_work = (phase.capacity * phase.utilization).reshape(-1, 24)
        work = original_work.copy()
        capacity = phase.capacity.reshape(-1, 24) * 0.99
        phase_shift = np.zeros_like(work)
        for origin in range(23):
            end = min(24, origin + flexibility.max_delay_hours + 1)
            destinations = np.argsort(daily_score[:, origin + 1 : end], axis=1)
            destinations += origin + 1
            remaining = original_work[:, origin] * flexibility.fraction
            for rank in range(destinations.shape[1]):
                destination = destinations[:, rank]
                better = daily_score[rows, destination] < daily_score[:, origin] - 1e-9
                spare = np.maximum(
                    0.0, capacity[rows, destination] - work[rows, destination]
                )
                amount = np.where(better, np.minimum(remaining, spare), 0.0)
                work[:, origin] -= amount
                work[rows, destination] += amount
                remaining -= amount
                phase_shift[:, origin] += amount
        work = work.reshape(sample_count, hour_count)
        utilization = np.divide(
            work, phase.capacity, out=np.zeros_like(work), where=phase.capacity > 0.0
        )
        scheduled.append(
            PhaseHours(
                phase.capacity, utilization, phase.efficiency, phase.hardware_profile
            )
        )
        shifted += phase_shift.reshape(sample_count, hour_count)
    return scheduled, shifted
