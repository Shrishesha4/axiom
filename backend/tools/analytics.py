from typing import Any

from services.forecasting import enrich_therapies_with_forecast
from services.investigation_cache import (
    enrich_therapies_with_publications,
    get_investigation_trials,
)
from services.live_data import fetch_pubmed, fetch_safety_profile, infer_condition
from services.therapy import (
    MECHANISM_DIFFERENTIATION,
    PHASE_WEIGHTS,
    aggregate_therapies,
    emerging_mechanisms_for_condition,
)


def search_trials(
    investigation_id: int,
    condition: str,
    phase: str | None = None,
    status: str | None = None,
) -> list[dict]:
    trials = get_investigation_trials(
        investigation_id,
        condition,
        phase=phase,
        status=status,
    )
    return trials[:100]


def get_therapy_landscape(
    investigation_id: int,
    condition: str,
) -> dict:
    trials = get_investigation_trials(investigation_id, condition)
    therapies = aggregate_therapies(trials)

    phase_dist: dict[str, int] = {}
    mechanism_dist: dict[str, int] = {}
    companies: set[str] = set()

    for trial in trials:
        phase = trial.get("phase") or "UNKNOWN"
        phase_dist[phase] = phase_dist.get(phase, 0) + 1
        mechanism = trial.get("mechanism") or "Other"
        mechanism_dist[mechanism] = mechanism_dist.get(mechanism, 0) + 1
        if trial.get("sponsor"):
            companies.add(trial["sponsor"])

    phase_iii = phase_dist.get("PHASE3", 0)
    emerging_set = emerging_mechanisms_for_condition(condition)
    emerging = sum(1 for therapy in therapies if therapy["mechanism"] in emerging_set)

    return {
        "condition": condition,
        "total_trials": len(trials),
        "total_companies": len(companies),
        "total_therapies": len(therapies),
        "phase_iii_count": phase_iii,
        "emerging_therapies": emerging,
        "phase_distribution": phase_dist,
        "mechanism_distribution": mechanism_dist,
    }


def rank_therapies_by_momentum(
    investigation_id: int,
    condition: str,
    limit: int = 10,
) -> list[dict]:
    trials = get_investigation_trials(investigation_id, condition)
    therapies = aggregate_therapies(trials)
    enriched = enrich_therapies_with_publications(
        investigation_id, therapies, condition, top_n=max(limit, 12)
    )
    enriched = enrich_therapies_with_forecast(enriched)

    result = []
    for therapy in enriched[:limit]:
        result.append(
            {
                "name": therapy["name"],
                "mechanism": therapy["mechanism"],
                "momentum_score": therapy["momentum_score"],
                "trial_count": therapy["trial_count"],
                "publication_count": therapy["publication_count"],
                "active_trials": therapy["active_trials"],
                "phase": therapy["phase"],
                "fda_approved": therapy["fda_approved"],
                "company": therapy["company"],
                "pos_percent": therapy["pos_percent"],
                "estimated_years_to_filing": therapy["estimated_years_to_filing"],
                "estimated_filing_year": therapy["estimated_filing_year"],
                "forecast_basis": therapy["forecast_basis"],
            }
        )
    return result


def get_competitive_matrix(
    investigation_id: int,
    condition: str,
) -> list[dict]:
    trials = get_investigation_trials(investigation_id, condition)
    therapies = enrich_therapies_with_publications(
        investigation_id, aggregate_therapies(trials), condition, top_n=20
    )

    matrix = []
    for therapy in therapies[:30]:
        therapy_trials = therapy["trials"]
        if not therapy_trials:
            continue

        phase_scores = [PHASE_WEIGHTS.get(trial.get("phase") or "", 10) for trial in therapy_trials]
        maturity = sum(phase_scores) / len(phase_scores)
        differentiation = MECHANISM_DIFFERENTIATION.get(therapy["mechanism"] or "Other", 50)
        differentiation += min(therapy["momentum_score"] / 10, 20)

        matrix.append(
            {
                "name": therapy["name"],
                "mechanism": therapy["mechanism"],
                "maturity": round(maturity, 1),
                "differentiation": round(min(differentiation, 100), 1),
                "momentum_score": therapy["momentum_score"],
                "trial_count": therapy["trial_count"],
            }
        )

    return sorted(matrix, key=lambda item: item["momentum_score"], reverse=True)


def get_publications(
    investigation_id: int,
    therapy_name: str,
    condition: str | None = None,
) -> list[dict]:
    return fetch_pubmed(therapy_name, condition=condition)


def get_safety_profile(therapy_name: str) -> dict:
    return fetch_safety_profile(therapy_name)


def get_whitespace_opportunities(
    investigation_id: int,
    condition: str,
    limit: int = 5,
) -> list[dict]:
    landscape = get_therapy_landscape(investigation_id, condition)
    total = landscape["total_trials"] or 1
    mechanism_dist = landscape["mechanism_distribution"]

    opportunities = []
    emerging_set = emerging_mechanisms_for_condition(condition)
    for mechanism, count in mechanism_dist.items():
        density_pct = round(count / total * 100, 1)
        differentiation = MECHANISM_DIFFERENTIATION.get(mechanism, 50)
        is_emerging = mechanism in emerging_set
        score = differentiation - density_pct + (10 if is_emerging else 0)
        score = max(0.0, min(100.0, score))

        rationale = (
            f"{mechanism} accounts for only {count} of {total} trials "
            f"({density_pct:.0f}%) despite a differentiation score of "
            f"{differentiation}/100"
            + (", and is an emerging mechanism class" if is_emerging else "")
            + " — potential white-space for new entrants."
        )

        opportunities.append(
            {
                "mechanism": mechanism,
                "trial_count": count,
                "density_pct": density_pct,
                "differentiation_score": differentiation,
                "is_emerging": is_emerging,
                "opportunity_score": round(score, 1),
                "rationale": rationale,
            }
        )

    return sorted(opportunities, key=lambda o: o["opportunity_score"], reverse=True)[:limit]


def generate_signals(
    investigation_id: int,
    condition: str,
    query: str | None = None,
) -> list[dict]:
    landscape = get_therapy_landscape(investigation_id, condition)
    rankings = rank_therapies_by_momentum(investigation_id, condition, limit=5)
    matrix = get_competitive_matrix(investigation_id, condition)
    emerging_set = emerging_mechanisms_for_condition(condition)

    signals: list[dict] = []
    total = landscape["total_trials"] or 1
    mechanism_dist = landscape["mechanism_distribution"]

    top_mechanism = max(mechanism_dist.items(), key=lambda item: item[1], default=("Other", 0))
    if top_mechanism[1] / total > 0.35:
        pct = round(top_mechanism[1] / total * 100)
        signals.append(
            {
                "id": 1,
                "title": f"{top_mechanism[0]} concentration in {condition}",
                "description": (
                    f"{top_mechanism[0]} accounts for {top_mechanism[1]} of {total} trials "
                    f"({pct}%) — the dominant competitive axis in this scan."
                ),
            }
        )

    emerging = [item for item in matrix if item["mechanism"] in emerging_set]
    if emerging:
        top_emerging = emerging[0]
        signals.append(
            {
                "id": 2,
                "title": f"Emerging {top_emerging['mechanism']} signal",
                "description": (
                    f"{top_emerging['name']} shows differentiation "
                    f"{top_emerging['differentiation']}/100 with lower density than "
                    f"{top_mechanism[0]} in {condition}."
                ),
            }
        )

    if rankings:
        differentiated = [
            item
            for item in rankings
            if item["mechanism"] not in (top_mechanism[0], "Other")
        ]
        if differentiated:
            lead = differentiated[0]
            signals.append(
                {
                    "id": 3,
                    "title": f"{lead['name']} outside the {top_mechanism[0]} cluster",
                    "description": (
                        f"{lead['mechanism']} asset with momentum {lead['momentum_score']} "
                        f"and {lead['trial_count']} trials — potential differentiation path."
                    ),
                }
            )

    if query and "underserved" in query.lower() and landscape["total_trials"] > 0:
        opps = get_whitespace_opportunities(investigation_id, condition, limit=1)
        if opps:
            opp = opps[0]
            signals.insert(
                0,
                {
                    "id": 0,
                    "title": f"Underserved: {opp['mechanism']}",
                    "description": opp["rationale"],
                },
            )

    return signals[:3]


def generate_executive_briefing(
    investigation_id: int,
    query: str,
    condition: str | None = None,
) -> str:
    resolved_condition = condition or infer_condition(query)
    landscape = get_therapy_landscape(investigation_id, resolved_condition)
    rankings = rank_therapies_by_momentum(investigation_id, resolved_condition, limit=10)
    signals = generate_signals(investigation_id, resolved_condition, query=query)

    lines = [
        f"# Executive Briefing: {resolved_condition}",
        "",
        f"**Investigation:** {query}",
        "",
        "## Key Metrics",
        f"- **Active Trials:** {landscape['total_trials']}",
        f"- **Companies:** {landscape['total_companies']}",
        f"- **Phase III Trials:** {landscape['phase_iii_count']}",
        f"- **Emerging Therapies:** {landscape['emerging_therapies']}",
        "",
        "## Market Signal",
        (
            "Trial activity clusters around the dominant mechanism class while newer approaches "
            "show lower density but higher differentiation potential."
        ),
        "",
        "## Top Therapies by Momentum",
        "",
        "| Therapy | Phase | Mechanism | Momentum Score |",
        "|---------|-------|-----------|----------------|",
    ]

    for ranking in rankings[:5]:
        lines.append(
            f"| {ranking['name']} | {ranking['phase']} | {ranking['mechanism']} | {ranking['momentum_score']} |"
        )

    lines.extend(["", "## Key Signals", ""])
    for signal in signals:
        lines.append(f"**{signal['id']}. {signal['title']}** — {signal['description']}")
        lines.append("")

    lines.extend(
        [
            "## Methodology",
            (
                "Momentum scores are computed server-side from live ClinicalTrials.gov data "
                "using phase weighting, active trial count, enrollment volume, publication count, "
                "and recency bonus. Safety and publication enrichment uses openFDA and PubMed."
            ),
            "",
            "*Generated by axiom.*",
        ]
    )

    return "\n".join(lines)
