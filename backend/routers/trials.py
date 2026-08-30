from fastapi import APIRouter, HTTPException, Query

from services.live_data import fetch_clinical_trials, infer_condition
from services.therapy import aggregate_therapies

router = APIRouter(prefix="/api", tags=["data"])


@router.get("/therapies")
def list_therapies(
    condition: str = Query(..., description="Disease or condition to query live"),
    limit: int = Query(50, le=100),
):
    trials = fetch_clinical_trials(condition)
    therapies = aggregate_therapies(trials)
    return [
        {
            "name": therapy["name"],
            "mechanism": therapy["mechanism"],
            "momentum_score": therapy["momentum_score"],
            "fda_approved": therapy["fda_approved"],
            "company": therapy["company"],
            "trial_count": therapy["trial_count"],
        }
        for therapy in therapies[:limit]
    ]


@router.get("/trials")
def list_trials(
    condition: str = Query(..., description="Disease or condition to query live"),
    phase: str | None = None,
    limit: int = Query(50, le=200),
):
    trials = fetch_clinical_trials(condition, phase=phase)
    return trials[:limit]


@router.get("/conditions/infer")
def infer_search_condition(query: str = Query(..., min_length=3)):
    return {"condition": infer_condition(query)}
