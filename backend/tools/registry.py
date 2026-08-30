import json
from typing import Any

from services.live_data import infer_condition, normalize_condition
from tools.analytics import (
    generate_executive_briefing,
    generate_signals,
    get_competitive_matrix,
    get_publications,
    get_safety_profile,
    get_therapy_landscape,
    get_whitespace_opportunities,
    rank_therapies_by_momentum,
    search_trials,
)

TOOL_DEFINITIONS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "search_trials",
            "description": "Search live ClinicalTrials.gov records by condition, phase, and recruitment status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "condition": {
                        "type": "string",
                        "description": "Disease or condition, e.g. Alzheimer Disease",
                    },
                    "phase": {
                        "type": "string",
                        "description": "Trial phase filter: PHASE1, PHASE2, PHASE3, or PHASE4",
                    },
                    "status": {
                        "type": "string",
                        "description": "Recruitment status, e.g. RECRUITING",
                    },
                },
                "required": ["condition"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_therapy_landscape",
            "description": "Aggregate live trial data into landscape stats: counts, phase distribution, mechanism breakdown.",
            "parameters": {
                "type": "object",
                "properties": {
                    "condition": {
                        "type": "string",
                        "description": "Disease or condition, e.g. Alzheimer Disease",
                    },
                },
                "required": ["condition"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "rank_therapies_by_momentum",
            "description": "Rank therapies by server-computed momentum score from live trial and publication data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "condition": {"type": "string", "description": "Disease or condition"},
                    "limit": {
                        "type": "integer",
                        "description": "Number of therapies to return",
                        "default": 10,
                    },
                },
                "required": ["condition"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_competitive_matrix",
            "description": "Build competitive positioning matrix with maturity and differentiation coordinates from live data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "condition": {"type": "string", "description": "Disease or condition"},
                },
                "required": ["condition"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_whitespace_opportunities",
            "description": "Identify underexploited mechanism classes (low trial density, high differentiation) as ranked white-space opportunities from live trial data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "condition": {"type": "string", "description": "Disease or condition"},
                    "limit": {
                        "type": "integer",
                        "description": "Number of opportunities to return",
                        "default": 5,
                    },
                },
                "required": ["condition"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_publications",
            "description": "Retrieve live PubMed publications for a therapy.",
            "parameters": {
                "type": "object",
                "properties": {
                    "therapy_name": {"type": "string", "description": "Drug or therapy name"},
                    "condition": {
                        "type": "string",
                        "description": "Optional disease context to narrow PubMed results",
                    },
                },
                "required": ["therapy_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_safety_profile",
            "description": "Get live FDA adverse event profile for a therapy from openFDA.",
            "parameters": {
                "type": "object",
                "properties": {
                    "therapy_name": {"type": "string", "description": "Drug or therapy name"},
                },
                "required": ["therapy_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_executive_briefing",
            "description": "Generate a structured executive briefing markdown report from live investigation data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "investigation_id": {"type": "integer", "description": "Current investigation ID"},
                    "condition": {
                        "type": "string",
                        "description": "Disease or condition for the briefing",
                    },
                },
                "required": ["investigation_id"],
            },
        },
    },
]

TRACE_LABELS: dict[str, str] = {
    "search_trials": "Searching ClinicalTrials.gov",
    "get_therapy_landscape": "Analyzing therapeutic landscape",
    "rank_therapies_by_momentum": "Ranking therapies by momentum",
    "get_competitive_matrix": "Building competitive matrix",
    "get_whitespace_opportunities": "Identifying white-space opportunities",
    "get_publications": "Querying PubMed",
    "get_safety_profile": "Querying openFDA safety data",
    "generate_executive_briefing": "Generating executive briefing",
}


def describe_tool_result(tool_name: str, result: Any) -> str:
    if tool_name == "search_trials":
        count = len(result) if isinstance(result, list) else 0
        return f"Found {count} live clinical trials"
    if tool_name == "get_therapy_landscape":
        return (
            f"Analyzed {result.get('total_trials', 0)} live trials across "
            f"{result.get('phase_iii_count', 0)} Phase III studies"
        )
    if tool_name == "rank_therapies_by_momentum":
        count = len(result) if isinstance(result, list) else 0
        top = result[0]["name"] if result else "N/A"
        return f"Ranked {count} therapies — top momentum: {top}"
    if tool_name == "get_competitive_matrix":
        count = len(result) if isinstance(result, list) else 0
        return f"Mapped {count} therapies on competitive matrix"
    if tool_name == "get_whitespace_opportunities":
        count = len(result) if isinstance(result, list) else 0
        top = result[0]["mechanism"] if result else "N/A"
        return f"Identified {count} white-space opportunities — top: {top}"
    if tool_name == "get_publications":
        count = len(result) if isinstance(result, list) else 0
        return f"Retrieved {count} PubMed publications"
    if tool_name == "get_safety_profile":
        total = result.get("total_reports", 0) if isinstance(result, dict) else 0
        therapy = result.get("therapy", "therapy") if isinstance(result, dict) else "therapy"
        return f"Loaded openFDA safety profile for {therapy} ({total} reported events)"
    if tool_name == "generate_executive_briefing":
        return "Executive briefing generated"
    return "Tool completed"


def execute_tool(
    investigation_id: int,
    query: str,
    tool_name: str,
    arguments: dict,
) -> Any:
    condition = normalize_condition(arguments.get("condition") or infer_condition(query))

    if tool_name == "search_trials":
        return search_trials(
            investigation_id,
            condition=condition,
            phase=arguments.get("phase"),
            status=arguments.get("status"),
        )
    if tool_name == "get_therapy_landscape":
        return get_therapy_landscape(investigation_id, condition=condition)
    if tool_name == "rank_therapies_by_momentum":
        return rank_therapies_by_momentum(
            investigation_id,
            condition=condition,
            limit=arguments.get("limit", 10),
        )
    if tool_name == "get_competitive_matrix":
        return get_competitive_matrix(investigation_id, condition=condition)
    if tool_name == "get_whitespace_opportunities":
        return get_whitespace_opportunities(
            investigation_id,
            condition=condition,
            limit=arguments.get("limit", 5),
        )
    if tool_name == "get_publications":
        return get_publications(
            investigation_id,
            arguments["therapy_name"],
            condition=arguments.get("condition") or condition,
        )
    if tool_name == "get_safety_profile":
        return get_safety_profile(arguments["therapy_name"])
    if tool_name == "generate_executive_briefing":
        inv_id = arguments.get("investigation_id", investigation_id)
        return generate_executive_briefing(
            inv_id,
            query,
            condition=arguments.get("condition") or condition,
        )

    raise ValueError(f"Unknown tool: {tool_name}")


def parse_tool_arguments(raw: str | None) -> dict:
    if not raw:
        return {}
    return json.loads(raw)
