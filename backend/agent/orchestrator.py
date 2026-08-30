import asyncio
import json
from datetime import datetime
from typing import Any, AsyncGenerator

from sqlalchemy.orm import Session

from agent.prompts import (
    BD_MEMO_PROMPT,
    BEAR_PROMPT,
    BULL_PROMPT,
    FOLLOWUP_PROMPT,
    INVESTIGATION_PROMPT,
    SIGNAL_EXPLAIN_PROMPT,
    SYNTHESIS_PROMPT,
    SYSTEM_PROMPT,
)
from auth import record_token_usage
from agent.openrouter_client import get_openrouter_client, openrouter_request_extras
from config import get_settings
from models.models import AgentTrace, Investigation, User
from serialization import serialize_utc
from services.live_data import infer_condition
from services.dashboard import (
    build_dashboard_config,
    build_market_signal_fallback,
    classify_investigation_intent,
    resolve_investigation_condition,
)
from tools.analytics import (
    generate_executive_briefing,
    generate_signals,
    get_whitespace_opportunities,
    search_trials,
)
from tools.registry import (
    TOOL_DEFINITIONS,
    TRACE_LABELS,
    describe_tool_result,
    execute_tool,
    parse_tool_arguments,
)

settings = get_settings()

MAX_TOOL_ROUNDS = 12


def _landscape_trial_count(landscape: Any) -> int:
    if isinstance(landscape, dict):
        return int(landscape.get("total_trials") or 0)
    return 0


def _list_result_count(result: Any) -> int:
    return len(result) if isinstance(result, list) else 0


def _merge_tool_results(tool_name: str, existing: Any, new: Any) -> Any:
    """Keep the richest tool output when the agent calls the same tool more than once."""
    if tool_name == "get_therapy_landscape":
        if _landscape_trial_count(new) > _landscape_trial_count(existing):
            return new
        return existing
    if tool_name in {
        "search_trials",
        "rank_therapies_by_momentum",
        "get_competitive_matrix",
        "get_whitespace_opportunities",
        "get_publications",
    }:
        if _list_result_count(new) > _list_result_count(existing):
            return new
        return existing
    return new


def _synthesis_contradicts_data(synthesis: str, landscape: dict[str, Any]) -> bool:
    if _landscape_trial_count(landscape) == 0:
        return False
    lowered = synthesis.lower()
    return any(
        phrase in lowered
        for phrase in (
            "0 trials",
            "zero trials",
            "no trials",
            "no relevant",
            "no live",
            "returned no",
            "contained 0",
        )
    )


def _system_prompt() -> str:
    prompt = SYSTEM_PROMPT
    if settings.openrouter_web_search_enabled:
        prompt += (
            "\nOpenRouter web search is enabled. Use recent web results for market context "
            "and news, but always prefer tool outputs for trial counts, rankings, and statistics. "
            "Cite web sources with markdown links named using the source domain."
        )
    return prompt


def _timestamp() -> str:
    return serialize_utc(datetime.utcnow())


def _trace_event(step: str, status: str, message: str) -> dict:
    return {
        "type": "trace",
        "step": step,
        "status": status,
        "message": message,
        "timestamp": _timestamp(),
    }


def _persist_trace(
    db: Session,
    investigation_id: int,
    step: str,
    message: str,
    status: str,
) -> None:
    db.add(
        AgentTrace(
            investigation_id=investigation_id,
            step=step,
            message=message,
            status=status,
        )
    )
    db.commit()


def _usage_tokens(response) -> int:
    usage = getattr(response, "usage", None)
    if usage:
        return int(getattr(usage, "total_tokens", 0) or 0)
    return 0


async def _agent_tool_loop(
    db: Session,
    investigation: Investigation,
    user: User,
    user_message: str,
    tools: list[dict] | None = None,
) -> AsyncGenerator[dict, None]:
    """Run OpenRouter agent with function calling; yield SSE trace events."""
    collected: dict[str, Any] = {}
    active_tools = tools or TOOL_DEFINITIONS

    messages: list[dict] = [
        {"role": "system", "content": _system_prompt()},
        {"role": "user", "content": user_message},
    ]

    client = get_openrouter_client()

    yield _trace_event("understand", "running", "Understanding question")
    await asyncio.sleep(0.3)
    _persist_trace(db, investigation.id, "understand", "Understanding question", "complete")
    yield _trace_event("understand", "complete", "Understanding question")

    if settings.openrouter_web_search_enabled:
        yield _trace_event("web_search", "running", "Grounding with OpenRouter web search")
        _persist_trace(
            db,
            investigation.id,
            "web_search",
            "Searched the web",
            "complete",
        )
        yield _trace_event("web_search", "complete", "Web search context enabled")

    synthesis: str | None = None

    for _ in range(MAX_TOOL_ROUNDS):
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=settings.openrouter_model,
            messages=messages,
            tools=active_tools,
            tool_choice="auto",
            **openrouter_request_extras(),
        )

        message = response.choices[0].message
        record_token_usage(db, user, _usage_tokens(response))

        if message.tool_calls:
            messages.append(
                {
                    "role": "assistant",
                    "content": message.content,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in message.tool_calls
                    ],
                }
            )

            for tc in message.tool_calls:
                tool_name = tc.function.name
                arguments = parse_tool_arguments(tc.function.arguments)

                yield _trace_event(
                    tool_name,
                    "running",
                    TRACE_LABELS.get(tool_name, tool_name),
                )

                result = await asyncio.to_thread(
                    execute_tool,
                    investigation.id,
                    investigation.query,
                    tool_name,
                    arguments,
                )
                if tool_name in collected:
                    collected[tool_name] = _merge_tool_results(
                        tool_name, collected[tool_name], result
                    )
                else:
                    collected[tool_name] = result

                complete_msg = describe_tool_result(tool_name, result)
                _persist_trace(db, investigation.id, tool_name, complete_msg, "complete")
                yield _trace_event(tool_name, "complete", complete_msg)

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, default=str),
                    }
                )
            continue

        if message.content:
            synthesis = message.content.strip()
            break

        break

    collected["_synthesis"] = synthesis
    yield {"type": "collected", "data": collected}


async def _fallback_tool_sequence(
    db: Session,
    investigation: Investigation,
) -> AsyncGenerator[dict, None]:
    """Deterministic tool execution when OpenRouter key is missing."""
    collected: dict[str, Any] = {}
    condition = infer_condition(investigation.query)

    yield _trace_event("understand", "running", "Understanding question")
    await asyncio.sleep(0.4)
    _persist_trace(db, investigation.id, "understand", "Understanding question", "complete")
    yield _trace_event("understand", "complete", "Understanding question")

    fallback_tools = [
        ("search_trials", {"condition": condition}),
        ("get_therapy_landscape", {"condition": condition}),
        ("rank_therapies_by_momentum", {"condition": condition, "limit": 10}),
        ("get_competitive_matrix", {"condition": condition}),
    ]

    for tool_name, arguments in fallback_tools:
        yield _trace_event(tool_name, "running", TRACE_LABELS.get(tool_name, tool_name))

        result = await asyncio.to_thread(
            execute_tool,
            investigation.id,
            investigation.query,
            tool_name,
            arguments,
        )
        collected[tool_name] = result

        complete_msg = describe_tool_result(tool_name, result)
        _persist_trace(db, investigation.id, tool_name, complete_msg, "complete")
        yield _trace_event(tool_name, "complete", complete_msg)

    yield {"type": "collected", "data": collected}


def _assemble_investigation_summary(
    investigation_id: int,
    query: str,
    collected: dict[str, Any],
    synthesis: str | None,
) -> dict:
    condition = resolve_investigation_condition(query, collected)
    intent = classify_investigation_intent(query)
    landscape = collected.get("get_therapy_landscape") or {}
    rankings = collected.get("rank_therapies_by_momentum") or []
    matrix = collected.get("get_competitive_matrix") or []
    trials = collected.get("search_trials") or []

    from tools.analytics import (
        get_competitive_matrix,
        get_therapy_landscape,
        rank_therapies_by_momentum,
    )

    if _landscape_trial_count(landscape) == 0:
        landscape = get_therapy_landscape(investigation_id, condition)

    if not trials:
        trials = search_trials(investigation_id, condition=condition)
    elif _list_result_count(trials) == 0:
        trials = search_trials(investigation_id, condition=condition)

    if not rankings:
        rankings = rank_therapies_by_momentum(
            investigation_id, condition=condition, limit=10
        )
    elif _list_result_count(rankings) == 0 and _landscape_trial_count(landscape) > 0:
        rankings = rank_therapies_by_momentum(
            investigation_id, condition=condition, limit=10
        )

    if not matrix:
        matrix = get_competitive_matrix(investigation_id, condition)
    elif _list_result_count(matrix) == 0 and _landscape_trial_count(landscape) > 0:
        matrix = get_competitive_matrix(investigation_id, condition)

    signals = generate_signals(investigation_id, condition=condition, query=query)

    opportunities = collected.get("get_whitespace_opportunities")
    if not opportunities:
        opportunities = get_whitespace_opportunities(investigation_id, condition=condition)

    fallback_signal = build_market_signal_fallback(
        query, condition, landscape, rankings, opportunities, intent
    )
    if synthesis and not _synthesis_contradicts_data(synthesis, landscape):
        market_signal = synthesis
    else:
        market_signal = fallback_signal

    dashboard = build_dashboard_config(
        query, condition, intent, landscape, rankings, opportunities, matrix
    )

    return {
        "condition": condition,
        "query": query,
        "intent": intent,
        "dashboard": dashboard,
        "landscape": landscape,
        "rankings": rankings,
        "matrix": matrix,
        "signals": signals,
        "opportunities": opportunities,
        "trials": trials[:15],
        "market_signal": market_signal,
    }


async def run_investigation(
    db: Session, investigation: Investigation, user: User
) -> AsyncGenerator[dict, None]:
    if investigation.summary_json and investigation.status == "complete":
        saved_total = _landscape_trial_count(
            (investigation.summary_json or {}).get("landscape") or {}
        )
        if saved_total > 0:
            yield {"type": "complete", "data": investigation.summary_json}
            return
        investigation.status = "running"
        investigation.summary_json = None
        db.commit()

    collected: dict[str, Any] = {}
    synthesis: str | None = None

    investigation_tools = [
        t for t in TOOL_DEFINITIONS
        if t["function"]["name"] != "generate_executive_briefing"
    ]

    if settings.openrouter_api_key:
        prompt = INVESTIGATION_PROMPT.format(query=investigation.query)
        async for event in _agent_tool_loop(db, investigation, user, prompt, investigation_tools):
            if event.get("type") == "collected":
                collected = event["data"]
                synthesis = collected.pop("_synthesis", None)
            else:
                yield event
    else:
        async for event in _fallback_tool_sequence(db, investigation):
            if event.get("type") == "collected":
                collected = event["data"]
            else:
                yield event

    yield _trace_event("synthesize", "running", "Generating intelligence")
    await asyncio.sleep(0.4)

    summary = _assemble_investigation_summary(
        investigation.id, investigation.query, collected, synthesis
    )

    _persist_trace(db, investigation.id, "synthesize", "Intelligence report ready", "complete")
    yield _trace_event("synthesize", "complete", "Intelligence report ready")

    inv = db.query(Investigation).filter(Investigation.id == investigation.id).first()
    if inv:
        inv.summary_json = summary
        inv.status = "complete"
        db.commit()

    yield {"type": "complete", "data": summary}


async def explain_signals(
    db: Session, investigation_id: int, user: User
) -> AsyncGenerator[str, None]:
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv or not inv.summary_json:
        yield "No investigation data available."
        return

    signals = inv.summary_json.get("signals", [])
    landscape = inv.summary_json.get("landscape", {})
    rankings = inv.summary_json.get("rankings", [])

    if not settings.openrouter_api_key:
        for s in signals:
            yield f"\n\n**{s['title']}**\n{s['description']}"
        return

    prompt = SIGNAL_EXPLAIN_PROMPT.format(
        signals=json.dumps(signals, indent=2),
        landscape=json.dumps(landscape, indent=2),
        rankings=json.dumps(rankings[:5], indent=2),
    )

    client = get_openrouter_client()
    stream = await asyncio.to_thread(
        lambda: client.chat.completions.create(
            model=settings.openrouter_model,
            messages=[
                {"role": "system", "content": _system_prompt()},
                {"role": "user", "content": prompt},
            ],
            stream=True,
            stream_options={"include_usage": True},
            **openrouter_request_extras(),
        )
    )

    for chunk in stream:
        if hasattr(chunk, "usage") and chunk.usage:
            record_token_usage(db, user, int(chunk.usage.total_tokens or 0))
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


async def ask_followup(
    db: Session, investigation_id: int, question: str, user: User
) -> AsyncGenerator[dict[str, Any], None]:
    """Yield SSE-style events: delta, tool, error."""
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv or not inv.summary_json:
        yield {"type": "delta", "content": "No investigation data available."}
        return

    if not settings.openrouter_api_key:
        matrix = inv.summary_json.get("matrix", [])
        underserved = [
            m for m in matrix
            if m.get("mechanism") not in ("Amyloid", "Other")
        ]
        if underserved:
            top = underserved[0]
            text = (
                f"Based on live trial data, **{top['mechanism']}** mechanisms appear less crowded. "
                f"{top['name']} shows differentiation score {top['differentiation']} "
                f"with momentum score {top['momentum_score']}."
            )
        else:
            text = (
                "Alternative mechanisms show lower trial density compared to the dominant class, "
                "suggesting potential differentiation opportunities."
            )
        yield {"type": "delta", "content": text}
        return

    client = get_openrouter_client()
    context = json.dumps(inv.summary_json, indent=2)
    messages: list[dict] = [
        {
            "role": "system",
            "content": (
                _system_prompt()
                + "\nYou may call tools to answer follow-up questions with fresh live data. "
                "Never invent statistics. After tools return, answer in plain prose."
            ),
        },
        {
            "role": "user",
            "content": FOLLOWUP_PROMPT.format(question=question, data=context),
        },
    ]

    followup_tools = [
        t for t in TOOL_DEFINITIONS
        if t["function"]["name"] != "generate_executive_briefing"
    ]

    used_tools = False
    for _ in range(MAX_TOOL_ROUNDS):
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=settings.openrouter_model,
            messages=messages,
            tools=followup_tools,
            tool_choice="auto",
            **openrouter_request_extras(),
        )
        record_token_usage(db, user, _usage_tokens(response))
        message = response.choices[0].message

        if message.tool_calls:
            used_tools = True
            messages.append(
                {
                    "role": "assistant",
                    "content": message.content,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in message.tool_calls
                    ],
                }
            )

            for tc in message.tool_calls:
                tool_name = tc.function.name
                arguments = parse_tool_arguments(tc.function.arguments)
                label = TRACE_LABELS.get(tool_name, tool_name)
                yield {
                    "type": "tool",
                    "step": tool_name,
                    "status": "running",
                    "message": label,
                }
                result = await asyncio.to_thread(
                    execute_tool,
                    investigation_id,
                    inv.query,
                    tool_name,
                    arguments,
                )
                complete_msg = describe_tool_result(tool_name, result)
                yield {
                    "type": "tool",
                    "step": tool_name,
                    "status": "complete",
                    "message": complete_msg,
                }
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, default=str),
                    }
                )
            continue

        if message.content:
            yield {"type": "delta", "content": message.content.strip()}
        return

    if used_tools:
        messages.append(
            {
                "role": "user",
                "content": (
                    "Using the tool results above, answer the original follow-up question in "
                    "plain prose. Do not call any more tools."
                ),
            }
        )

    stream = await asyncio.to_thread(
        lambda: client.chat.completions.create(
            model=settings.openrouter_model,
            messages=messages,
            stream=True,
            stream_options={"include_usage": True},
            **openrouter_request_extras(),
        )
    )

    for chunk in stream:
        if hasattr(chunk, "usage") and chunk.usage:
            record_token_usage(db, user, int(chunk.usage.total_tokens or 0))
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content
        if delta:
            yield {"type": "delta", "content": delta}


def get_briefing(db: Session, inv: Investigation) -> str:
    if not inv:
        return "Investigation not found."
    condition = None
    if inv.summary_json:
        condition = inv.summary_json.get("condition")
    return generate_executive_briefing(inv.id, inv.query, condition=condition)


async def run_debate(
    db: Session, investigation_id: int, user: User
) -> AsyncGenerator[dict, None]:
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv or not inv.summary_json:
        yield {"type": "error", "message": "No investigation data available."}
        return

    data = json.dumps(
        {
            "condition": inv.summary_json.get("condition"),
            "landscape": inv.summary_json.get("landscape"),
            "rankings": inv.summary_json.get("rankings", [])[:8],
            "matrix": inv.summary_json.get("matrix", [])[:8],
            "signals": inv.summary_json.get("signals", []),
            "opportunities": inv.summary_json.get("opportunities", []),
        },
        indent=2,
        default=str,
    )

    if not settings.openrouter_api_key:
        rankings = inv.summary_json.get("rankings", [])
        top = rankings[0] if rankings else None
        bull = (
            f"{top['name']} leads with momentum score {top['momentum_score']}."
            if top
            else "Insufficient data."
        )
        bear = (
            "Trial activity concentrates in a dominant mechanism class, "
            "limiting differentiation for new entrants."
        )
        synthesis = "Momentum favors the leading candidate; crowding remains the key risk."
        yield {"type": "delta", "side": "bull", "content": bull}
        yield {"type": "delta", "side": "bear", "content": bear}
        yield {"type": "delta", "side": "synthesis", "content": synthesis}
        return

    client = get_openrouter_client()
    bull_text, bear_text = "", ""

    for side, prompt in (
        ("bull", BULL_PROMPT.format(data=data)),
        ("bear", BEAR_PROMPT.format(data=data)),
    ):
        stream = await asyncio.to_thread(
            lambda p=prompt: client.chat.completions.create(
                model=settings.openrouter_model,
                messages=[
                    {"role": "system", "content": _system_prompt()},
                    {"role": "user", "content": p},
                ],
                stream=True,
                stream_options={"include_usage": True},
            )
        )
        for chunk in stream:
            if hasattr(chunk, "usage") and chunk.usage:
                record_token_usage(db, user, int(chunk.usage.total_tokens or 0))
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                if side == "bull":
                    bull_text += delta
                else:
                    bear_text += delta
                yield {"type": "delta", "side": side, "content": delta}

    synth_prompt = SYNTHESIS_PROMPT.format(bull=bull_text, bear=bear_text)
    stream = await asyncio.to_thread(
        lambda: client.chat.completions.create(
            model=settings.openrouter_model,
            messages=[
                {"role": "system", "content": _system_prompt()},
                {"role": "user", "content": synth_prompt},
            ],
            stream=True,
            stream_options={"include_usage": True},
        )
    )
    for chunk in stream:
        if hasattr(chunk, "usage") and chunk.usage:
            record_token_usage(db, user, int(chunk.usage.total_tokens or 0))
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content
        if delta:
            yield {"type": "delta", "side": "synthesis", "content": delta}


async def draft_bd_memo(
    db: Session, investigation_id: int, therapy_name: str, user: User
) -> AsyncGenerator[str, None]:
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv or not inv.summary_json:
        yield "No investigation data available."
        return

    rankings = inv.summary_json.get("rankings", [])
    matrix = inv.summary_json.get("matrix", [])
    target = next((r for r in rankings if r["name"] == therapy_name), None)
    if not target:
        yield f"No ranked data found for '{therapy_name}'."
        return

    context = json.dumps(
        {
            "condition": inv.summary_json.get("condition"),
            "rankings": rankings[:10],
            "matrix": matrix[:10],
            "signals": inv.summary_json.get("signals", []),
        },
        indent=2,
        default=str,
    )

    if not settings.openrouter_api_key:
        yield (
            f"{target['name']} ({target['mechanism']}, {target['phase']}) shows momentum "
            f"score {target['momentum_score']} across {target['trial_count']} trials — "
            "consider outreach given its relative competitive position."
        )
        return

    prompt = BD_MEMO_PROMPT.format(
        therapy_data=json.dumps(target, default=str), context=context
    )
    client = get_openrouter_client()
    stream = await asyncio.to_thread(
        lambda: client.chat.completions.create(
            model=settings.openrouter_model,
            messages=[
                {"role": "system", "content": _system_prompt()},
                {"role": "user", "content": prompt},
            ],
            stream=True,
            stream_options={"include_usage": True},
        )
    )
    for chunk in stream:
        if hasattr(chunk, "usage") and chunk.usage:
            record_token_usage(db, user, int(chunk.usage.total_tokens or 0))
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
