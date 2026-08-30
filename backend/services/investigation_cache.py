from typing import Any

from services.live_data import fetch_clinical_trials, fetch_pubmed, normalize_condition
from services.therapy import apply_publication_counts, normalize_drug_name

_investigation_trials: dict[tuple[int, str], list[dict]] = {}
_publication_counts: dict[tuple[int, str], int] = {}


def get_investigation_trials(
    investigation_id: int,
    condition: str,
    phase: str | None = None,
    status: str | None = None,
    force_refresh: bool = False,
) -> list[dict]:
    cache_key = (investigation_id, normalize_condition(condition).lower())
    if not force_refresh and cache_key in _investigation_trials:
        trials = _investigation_trials[cache_key]
    else:
        trials = fetch_clinical_trials(condition, phase=phase, status=status)
        _investigation_trials[cache_key] = trials

    if phase:
        trials = [trial for trial in trials if trial.get("phase") == phase]
    if status:
        trials = [trial for trial in trials if trial.get("status") == status]
    return trials


def get_publication_count(
    investigation_id: int,
    therapy_name: str,
    condition: str | None = None,
) -> int:
    key = (investigation_id, normalize_drug_name(therapy_name))
    if key in _publication_counts:
        return _publication_counts[key]

    count = len(fetch_pubmed(therapy_name, condition=condition, max_results=8))
    _publication_counts[key] = count
    return count


def enrich_therapies_with_publications(
    investigation_id: int,
    therapies: list[dict[str, Any]],
    condition: str,
    top_n: int = 12,
) -> list[dict[str, Any]]:
    pub_counts: dict[str, int] = {}
    for therapy in therapies[:top_n]:
        key = normalize_drug_name(therapy["name"])
        pub_counts[key] = get_publication_count(
            investigation_id, therapy["name"], condition=condition
        )
    return apply_publication_counts(therapies, pub_counts)


def clear_investigation_cache(investigation_id: int) -> None:
    for key in list(_investigation_trials):
        if key[0] == investigation_id:
            del _investigation_trials[key]
    for key in list(_publication_counts):
        if key[0] == investigation_id:
            del _publication_counts[key]
