from datetime import datetime
from typing import Any

POS_BY_PHASE = {"PHASE1": 10, "PHASE2": 15, "PHASE3": 50, "PHASE4": 90}
POS_DEFAULT = 5
NEGATIVE_STATUSES = {"TERMINATED", "WITHDRAWN", "SUSPENDED"}
POS_NEGATIVE_MULTIPLIER = 0.15

REMAINING_YEARS_TO_FILING = {"PHASE1": 6.5, "PHASE2": 4.5, "PHASE3": 2.5, "PHASE4": 0.0}
REMAINING_YEARS_DEFAULT = 7.0
ELAPSED_DAMPENING = 0.5
MAX_REDUCTION_FRACTION = 0.6

FORECAST_DISCLAIMER = (
    "MVP estimate — derived from a hardcoded industry-benchmark phase-transition "
    "table, not a validated statistical model."
)


def calculate_pos_and_timeline(therapy: dict[str, Any]) -> dict[str, Any]:
    max_phase = therapy.get("phase") or ""
    phase_trials = [t for t in therapy.get("trials", []) if t.get("phase") == max_phase]

    pos = POS_BY_PHASE.get(max_phase, POS_DEFAULT)
    if any(t.get("status") in NEGATIVE_STATUSES for t in phase_trials):
        pos *= POS_NEGATIVE_MULTIPLIER

    if max_phase == "PHASE4":
        return {
            "pos_percent": round(pos, 1),
            "estimated_years_to_filing": 0.0,
            "estimated_filing_year": datetime.now().year,
            "forecast_basis": FORECAST_DISCLAIMER,
        }

    base_years = REMAINING_YEARS_TO_FILING.get(max_phase, REMAINING_YEARS_DEFAULT)
    latest_start = max((t.get("start_date") or "" for t in phase_trials), default="")
    elapsed = 0.0
    if latest_start:
        try:
            elapsed = max(datetime.now().year - int(latest_start[:4]), 0)
        except ValueError:
            elapsed = 0.0

    reduction = min(elapsed * ELAPSED_DAMPENING, base_years * MAX_REDUCTION_FRACTION)
    remaining = max(base_years - reduction, 1.0)

    return {
        "pos_percent": round(pos, 1),
        "estimated_years_to_filing": round(remaining, 1),
        "estimated_filing_year": datetime.now().year + round(remaining),
        "forecast_basis": FORECAST_DISCLAIMER,
    }


def enrich_therapies_with_forecast(therapies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{**therapy, **calculate_pos_and_timeline(therapy)} for therapy in therapies]
