"""Query intent + personalized dashboard layout for investigations."""

from __future__ import annotations

import json
import re
from typing import Any

from services.live_data import infer_condition, normalize_condition


def _landscape_trial_count(landscape: Any) -> int:
    if isinstance(landscape, dict):
        return int(landscape.get("total_trials") or 0)
    return 0


def resolve_investigation_condition(query: str, collected: dict[str, Any]) -> str:
    """Prefer the condition that produced the richest trial data."""
    candidates: list[tuple[int, str]] = []

    landscape = collected.get("get_therapy_landscape")
    if isinstance(landscape, dict) and landscape.get("condition"):
        candidates.append(
            (_landscape_trial_count(landscape), str(landscape["condition"]))
        )

    for tool in ("search_trials", "rank_therapies_by_momentum", "get_competitive_matrix"):
        payload = collected.get(tool)
        if isinstance(payload, list) and payload:
            first = payload[0]
            if isinstance(first, dict) and first.get("condition"):
                candidates.append((len(payload), str(first["condition"])))

    if candidates:
        _score, condition = max(candidates, key=lambda item: item[0])
        return normalize_condition(condition)

    return normalize_condition(infer_condition(query))


def classify_investigation_intent(query: str) -> str:
    lowered = query.lower()
    if any(
        token in lowered
        for token in (
            "white-space",
            "whitespace",
            "white space",
            "underserved",
            "underexploited",
            "under-served",
            "gap",
            "unmet need",
        )
    ):
        return "whitespace"
    if any(
        token in lowered
        for token in (
            "adverse event",
            "adverse events",
            "safety",
            "faers",
            "openfda",
            "side effect",
            "tolerability",
        )
    ):
        return "safety"
    if any(
        token in lowered
        for token in (
            "momentum",
            "rank",
            "ranking",
            "leading",
            "top therap",
            "fastest",
        )
    ):
        return "momentum"
    if any(
        token in lowered
        for token in (
            "timeline",
            "filing",
            "probability of success",
            "pos ",
            "approval",
            "launch",
            "regulatory",
        )
    ):
        return "timeline"
    if any(
        token in lowered
        for token in (
            "compare",
            "comparison",
            "versus",
            " vs ",
            "crowded",
            "emerging mechanism",
        )
    ):
        return "mechanism_compare"
    if any(token in lowered for token in ("publication", "pubmed", "literature", "evidence")):
        return "publications"
    if any(token in lowered for token in ("debate", "investment", "portfolio", "prioritize")):
        return "investment"
    return "landscape"


def followup_needs_live_data(question: str) -> bool:
    """Return True only when a follow-up explicitly needs fresh live API calls."""
    lowered = question.lower().strip()

    refresh_tokens = (
        "latest",
        "current data",
        "live data",
        "fresh data",
        "update",
        "updated",
        "refresh",
        "re-run",
        "rerun",
        "search again",
        "look again",
        "pull new",
        "fetch new",
        "run again",
    )
    if any(token in lowered for token in refresh_tokens):
        return True

    tool_specific = (
        "safety profile",
        "adverse event",
        "adverse events",
        "openfda",
        "faers",
        "side effect",
        "pubmed",
        "publication",
        "publications",
        "literature search",
        "search trial",
        "search trials",
        "find trial",
        "find trials",
        "nct ",
        "nct-",
        "how many trial",
        "trial count",
        "clinicaltrials.gov",
    )
    return any(token in lowered for token in tool_specific)


def build_followup_context(summary_json: dict[str, Any]) -> str:
    """Trim investigation context to fields useful for follow-up answers."""
    keys = (
        "condition",
        "query",
        "landscape",
        "rankings",
        "matrix",
        "signals",
        "opportunities",
    )
    subset = {key: summary_json[key] for key in keys if key in summary_json}
    return json.dumps(subset, indent=2, default=str)


def _top_mechanism(mechanism_dist: dict[str, int]) -> tuple[str, int]:
    if not mechanism_dist:
        return ("Other", 0)
    return max(mechanism_dist.items(), key=lambda item: item[1])


def _meaningful_mechanisms(mechanism_dist: dict[str, int]) -> int:
    return sum(1 for name, count in mechanism_dist.items() if name != "Other" and count > 0)


def build_market_signal_fallback(
    query: str,
    condition: str,
    landscape: dict[str, Any],
    rankings: list[dict],
    opportunities: list[dict],
    intent: str,
) -> str:
    total = landscape.get("total_trials") or 0
    top_mech, top_mech_count = _top_mechanism(landscape.get("mechanism_distribution") or {})
    lead = rankings[0] if rankings else None
    top_opp = opportunities[0] if opportunities else None

    if total == 0:
        return (
            f"No live trials were found for “{condition}”. "
            f"Try narrowing the question to a specific disease, mechanism, or therapy class."
        )

    if intent == "whitespace" and top_opp:
        return (
            f"Across {total} {condition} trials, {top_opp['mechanism']} is the strongest white-space "
            f"signal ({top_opp['trial_count']} trials, {top_opp['density_pct']:.0f}% density) "
            f"with an opportunity score of {top_opp['opportunity_score']}."
        )

    if intent == "momentum" and lead:
        return (
            f"{lead['name']} leads {condition} momentum at {lead['momentum_score']} "
            f"({lead['mechanism']}, {lead['trial_count']} trials, {lead.get('phase', 'unknown phase')})."
        )

    if intent == "timeline" and lead:
        return (
            f"{lead['name']} shows the highest near-term filing signal among {condition} assets "
            f"(estimated {lead.get('estimated_filing_year', '—')}, PoS {lead.get('pos_percent', '—')}%)."
        )

    if intent == "safety":
        return (
            f"Safety comparison should focus on the highest-volume {condition} therapies in trial data "
            f"({total} trials tracked). Pull openFDA profiles for the lead assets before outreach."
        )

    if intent == "mechanism_compare":
        pct = round(top_mech_count / total * 100) if total else 0
        return (
            f"{top_mech} dominates {condition} with {top_mech_count} of {total} trials ({pct}%). "
            f"Compare against lower-density mechanism classes for differentiation."
        )

    pct = round(top_mech_count / total * 100) if total else 0
    lead_line = (
        f" {lead['name']} ({lead['mechanism']}) leads momentum at {lead['momentum_score']}."
        if lead
        else ""
    )
    return (
        f"Live scan of {total} {condition} trials shows {top_mech} concentration at {pct}% "
        f"({top_mech_count} trials).{lead_line}"
    ).strip()


def build_dashboard_config(
    query: str,
    condition: str,
    intent: str,
    landscape: dict[str, Any],
    rankings: list[dict],
    opportunities: list[dict],
    matrix: list[dict],
) -> dict[str, Any]:
    total = landscape.get("total_trials") or 0
    companies = landscape.get("total_companies") or 0
    phase_iii = landscape.get("phase_iii_count") or 0
    emerging = landscape.get("emerging_therapies") or 0
    mechanism_dist = landscape.get("mechanism_distribution") or {}
    top_mech, _ = _top_mechanism(mechanism_dist)
    lead = rankings[0] if rankings else None
    top_opp = opportunities[0] if opportunities else None

    intent_titles = {
        "whitespace": f"White-space scan · {condition}",
        "safety": f"Safety lens · {condition}",
        "momentum": f"Momentum ranking · {condition}",
        "timeline": f"Filing timeline view · {condition}",
        "mechanism_compare": f"Mechanism comparison · {condition}",
        "publications": f"Evidence map · {condition}",
        "investment": f"Investment view · {condition}",
        "landscape": f"Competitive landscape · {condition}",
    }

    subtitle = re.sub(r"\s+", " ", query.strip())
    if len(subtitle) > 140:
        subtitle = subtitle[:137] + "…"

    if intent == "whitespace":
        kpis = [
            {"label": "Trials scanned", "value": total},
            {"label": "Mechanisms", "value": len(mechanism_dist)},
            {
                "label": "Top opportunity",
                "value": top_opp["opportunity_score"] if top_opp else "—",
            },
            {
                "label": "Underserved lead",
                "value": top_opp["mechanism"] if top_opp else "—",
            },
        ]
    elif intent == "momentum":
        kpis = [
            {"label": "Active trials", "value": total},
            {"label": "Therapies ranked", "value": len(rankings)},
            {
                "label": "Lead momentum",
                "value": lead["momentum_score"] if lead else "—",
            },
            {"label": "Lead therapy", "value": (lead or {}).get("name", "—")},
        ]
    elif intent == "timeline":
        kpis = [
            {"label": "Trials tracked", "value": total},
            {"label": "Phase III", "value": phase_iii},
            {
                "label": "Nearest filing",
                "value": (lead or {}).get("estimated_filing_year", "—"),
            },
            {"label": "Lead PoS", "value": f"{lead['pos_percent']}%" if lead else "—"},
        ]
    elif intent == "safety":
        kpis = [
            {"label": "Trials in scope", "value": total},
            {"label": "Therapies", "value": landscape.get("total_therapies") or 0},
            {"label": "Companies", "value": companies},
            {"label": "Dominant class", "value": top_mech},
        ]
    else:
        kpis = [
            {"label": "Active trials", "value": total},
            {"label": "Companies", "value": companies},
            {"label": "Phase III", "value": phase_iii},
            {"label": "Emerging assets", "value": emerging},
        ]

    show_matrix = bool(matrix) and intent not in ("publications",)
    show_phases = bool(landscape.get("phase_distribution")) and intent not in (
        "safety",
        "publications",
    )
    show_mechanisms = _meaningful_mechanisms(mechanism_dist) > 0 or bool(mechanism_dist)
    show_whitespace = bool(opportunities) and intent in (
        "whitespace",
        "landscape",
        "mechanism_compare",
        "investment",
    )
    show_momentum = bool(rankings) and intent in (
        "momentum",
        "timeline",
        "landscape",
        "investment",
        "mechanism_compare",
    )
    show_trials = total > 0

    section_titles = {
        "market_signal": {
            "whitespace": "White-space insight",
            "momentum": "Momentum takeaway",
            "timeline": "Timeline takeaway",
            "safety": "Safety framing",
            "mechanism_compare": "Comparison insight",
        }.get(intent, "Market signal"),
        "competitive_matrix": {
            "whitespace": "Density vs. differentiation",
            "mechanism_compare": "Mechanism positioning map",
            "momentum": "Competitive positioning",
        }.get(intent, "Competitive landscape"),
        "phase_chart": "Trial phases in scope",
        "mechanism_chart": f"Mechanisms in {condition}",
        "whitespace": f"Underserved mechanisms · {condition}",
        "trials_table": f"Trials driving this view · {condition}",
        "momentum_rankings": {
            "timeline": "Filing & momentum leaders",
            "momentum": "Top therapies by momentum",
        }.get(intent, "Competitive momentum"),
    }

    return {
        "intent": intent,
        "title": intent_titles.get(intent, intent_titles["landscape"]),
        "subtitle": subtitle,
        "kpis": kpis,
        "sections": {
            "market_signal": True,
            "competitive_matrix": show_matrix,
            "phase_chart": show_phases,
            "mechanism_chart": show_mechanisms,
            "whitespace": show_whitespace,
            "trials_table": show_trials,
            "momentum_rankings": show_momentum,
        },
        "section_titles": section_titles,
    }
