import math
import re
from collections import defaultdict
from datetime import datetime
from typing import Any

MECHANISM_MAP = {
    "lecanemab": "Amyloid",
    "donanemab": "Amyloid",
    "aducanumab": "Amyloid",
    "gantenerumab": "Amyloid",
    "solanezumab": "Amyloid",
    "bapineuzumab": "Amyloid",
    "crenezumab": "Amyloid",
    "semorinemab": "Tau",
    "gosuranemab": "Tau",
    "bepranemab": "Tau",
    "semaglutide": "GLP-1",
    "liraglutide": "GLP-1",
    "memantine": "NMDA antagonist",
    "donepezil": "Cholinesterase inhibitor",
    "rivastigmine": "Cholinesterase inhibitor",
    "galantamine": "Cholinesterase inhibitor",
}

FDA_APPROVED = {
    "lecanemab",
    "donanemab",
    "aducanumab",
    "donepezil",
    "memantine",
    "rivastigmine",
    "galantamine",
}

PHASE_WEIGHTS = {"PHASE1": 15, "PHASE2": 30, "PHASE3": 50, "PHASE4": 70}
ACTIVE_STATUSES = {"RECRUITING", "ACTIVE_NOT_RECRUITING", "ENROLLING_BY_INVITATION"}
EMERGING_MECHANISMS = {"Tau", "Neuroinflammation", "GLP-1"}
MECHANISM_DIFFERENTIATION = {
    "Amyloid": 30,
    "Tau": 70,
    "Neuroinflammation": 80,
    "GLP-1": 75,
    "NMDA antagonist": 20,
    "Cholinesterase inhibitor": 15,
    "Immuno-oncology": 55,
    "EGFR TKI": 40,
    "TNF inhibitor": 25,
    "Biologic immunomodulator": 60,
    "HER2-targeted": 35,
    "Cell therapy": 85,
    "KRAS inhibitor": 78,
    "JAK inhibitor": 45,
    "B-cell / lymphocyte modulator": 65,
    "Other": 50,
}


def emerging_mechanisms_for_condition(condition: str) -> set[str]:
    lowered = condition.lower()
    if "alzheimer" in lowered or "parkinson" in lowered:
        return {"Tau", "Neuroinflammation", "GLP-1"}
    if "cancer" in lowered or "melanoma" in lowered or "lung" in lowered:
        return {"Cell therapy", "KRAS inhibitor", "Immuno-oncology"}
    if "arthritis" in lowered or "sclerosis" in lowered or "crohn" in lowered:
        return {"JAK inhibitor", "Biologic immunomodulator", "Cell therapy"}
    if "obesity" in lowered or "diabetes" in lowered:
        return {"GLP-1", "Cell therapy"}
    return {"Cell therapy", "KRAS inhibitor", "Neuroinflammation"}

SKIP_THERAPY_NAMES = {"placebo", "unknown", "saline", "vehicle"}


def normalize_drug_name(name: str) -> str:
    name = re.sub(r"\[.*?\]", "", name)
    name = re.sub(r"\(.*?\)", "", name)
    return name.strip().lower()


def infer_mechanism(drug_name: str) -> str:
    lower = drug_name.lower()
    for key, mech in MECHANISM_MAP.items():
        if key in lower:
            return mech
    if "amyloid" in lower or "abeta" in lower:
        return "Amyloid"
    if "tau" in lower:
        return "Tau"
    if "glp" in lower or "semaglutide" in lower or "liraglutide" in lower:
        return "GLP-1"
    if "inflamm" in lower or "microglia" in lower:
        return "Neuroinflammation"
    if any(k in lower for k in ("pembrolizumab", "nivolumab", "atezolizumab", "durvalumab", "pd-1", "pd1", "pd-l1")):
        return "Immuno-oncology"
    if any(k in lower for k in ("osimertinib", "erlotinib", "gefitinib", "egfr")):
        return "EGFR TKI"
    if any(k in lower for k in ("adalimumab", "etanercept", "infliximab", "tnf")):
        return "TNF inhibitor"
    if any(k in lower for k in ("tocilizumab", "rituximab", "il-6", "il6")):
        return "Biologic immunomodulator"
    if any(k in lower for k in ("trastuzumab", "pertuzumab", "her2")):
        return "HER2-targeted"
    if any(k in lower for k in ("car-t", "cart", "cell therapy")):
        return "Cell therapy"
    if any(k in lower for k in ("kras", "sotorasib", "adagrasib")):
        return "KRAS inhibitor"
    if any(k in lower for k in ("jak", "tofacitinib", "baricitinib", "upadacitinib")):
        return "JAK inhibitor"
    if any(k in lower for k in ("cd19", "ocrelizumab", "natalizumab")):
        return "B-cell / lymphocyte modulator"
    return "Other"


def is_fda_approved(drug_name: str) -> bool:
    norm = normalize_drug_name(drug_name)
    return any(approved in norm for approved in FDA_APPROVED)


def calculate_momentum_score(therapy_trials: list[dict], pub_count: int = 0) -> float:
    max_phase_weight = 0
    active_count = 0
    total_enrollment = 0
    latest_start = None

    for trial in therapy_trials:
        phase_weight = PHASE_WEIGHTS.get(trial.get("phase") or "", 10)
        max_phase_weight = max(max_phase_weight, phase_weight)
        if trial.get("status") in ACTIVE_STATUSES:
            active_count += 1
        total_enrollment += trial.get("enrollment") or 0
        start_date = trial.get("start_date") or ""
        if start_date and (latest_start is None or start_date > latest_start):
            latest_start = start_date

    score = float(max_phase_weight)
    score += active_count * 5
    if total_enrollment > 0:
        score += math.log(total_enrollment + 1) * 3
    score += pub_count * 2

    if latest_start:
        try:
            year = int(latest_start[:4])
            if year >= datetime.now().year - 2:
                score += 10
        except ValueError:
            pass

    return round(score, 1)


def _therapy_phase(trials: list[dict]) -> str:
  phases = [t.get("phase") or "UNKNOWN" for t in trials]
  order = {"PHASE4": 4, "PHASE3": 3, "PHASE2": 2, "PHASE1": 1}
  return max(phases, key=lambda p: order.get(p, 0))


def aggregate_therapies(trials: list[dict]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "name": "",
            "mechanism": "Other",
            "trials": [],
            "company": None,
            "fda_approved": False,
            "publication_count": 0,
        }
    )

    for trial in trials:
        interventions = [
            drug
            for drug in (trial.get("interventions") or [])
            if normalize_drug_name(drug) not in SKIP_THERAPY_NAMES
        ]
        primary = interventions[0] if interventions else trial.get("therapy")
        if not primary or normalize_drug_name(primary) in SKIP_THERAPY_NAMES:
            continue

        key = normalize_drug_name(primary)
        entry = grouped[key]
        entry["name"] = primary.strip()
        entry["mechanism"] = infer_mechanism(primary)
        entry["fda_approved"] = is_fda_approved(primary)
        entry["trials"].append(trial)
        if trial.get("sponsor"):
            entry["company"] = trial["sponsor"]

    therapies = []
    for entry in grouped.values():
        therapy_trials = entry["trials"]
        therapies.append(
            {
                "name": entry["name"],
                "mechanism": entry["mechanism"],
                "momentum_score": calculate_momentum_score(
                    therapy_trials, entry["publication_count"]
                ),
                "trial_count": len(therapy_trials),
                "publication_count": entry["publication_count"],
                "active_trials": sum(
                    1 for t in therapy_trials if t.get("status") in ACTIVE_STATUSES
                ),
                "phase": _therapy_phase(therapy_trials),
                "fda_approved": entry["fda_approved"],
                "company": entry["company"],
                "trials": therapy_trials,
            }
        )

    return sorted(therapies, key=lambda t: t["momentum_score"], reverse=True)


def apply_publication_counts(
    therapies: list[dict[str, Any]], pub_counts: dict[str, int]
) -> list[dict[str, Any]]:
    updated = []
    for therapy in therapies:
        key = normalize_drug_name(therapy["name"])
        pub_count = pub_counts.get(key, therapy.get("publication_count", 0))
        item = {**therapy}
        item["publication_count"] = pub_count
        item["momentum_score"] = calculate_momentum_score(therapy["trials"], pub_count)
        updated.append(item)
    return sorted(updated, key=lambda t: t["momentum_score"], reverse=True)
