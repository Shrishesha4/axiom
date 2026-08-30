from datetime import datetime

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from serialization import serialize_utc
from agent.orchestrator import (
    ask_followup,
    draft_bd_memo,
    explain_signals,
    get_briefing,
    run_debate,
    run_investigation,
)
from auth import check_token_budget, get_current_user, get_current_user_sse
from database import SessionLocal, get_db
from models.models import Investigation, User
from services.live_data import infer_condition
from tools.analytics import (
    get_publications,
    get_safety_profile,
    rank_therapies_by_momentum,
    search_trials,
)

router = APIRouter(prefix="/api/investigations", tags=["investigations"])


class CreateInvestigation(BaseModel):
    query: str


class AskRequest(BaseModel):
    question: str


class MemoRequest(BaseModel):
    therapy_name: str


@router.get("")
def list_investigations(
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    invs = (
        db.query(Investigation)
        .filter(Investigation.user_id == user.id)
        .order_by(Investigation.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": inv.id,
            "query": inv.query,
            "status": inv.status,
            "created_at": serialize_utc(inv.created_at),
        }
        for inv in invs
    ]


@router.post("")
def create_investigation(
    body: CreateInvestigation,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    check_token_budget(user, estimated_tokens=5000)
    inv = Investigation(query=body.query, status="pending", user_id=user.id)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return {"id": inv.id, "query": inv.query, "status": inv.status}


@router.get("/portfolio")
def get_portfolio(
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    invs = (
        db.query(Investigation)
        .filter(Investigation.user_id == user.id, Investigation.status == "complete")
        .order_by(Investigation.created_at.desc())
        .all()
    )

    items = []
    for inv in invs:
        s = inv.summary_json or {}
        landscape = s.get("landscape", {})
        rankings = s.get("rankings", [])
        top = rankings[0] if rankings else None
        items.append(
            {
                "id": inv.id,
                "query": inv.query,
                "condition": s.get("condition"),
                "created_at": serialize_utc(inv.created_at),
                "total_trials": landscape.get("total_trials", 0),
                "total_companies": landscape.get("total_companies", 0),
                "phase_iii_count": landscape.get("phase_iii_count", 0),
                "emerging_therapies": landscape.get("emerging_therapies", 0),
                "top_therapy": top["name"] if top else None,
                "top_mechanism": top["mechanism"] if top else None,
                "top_momentum_score": top["momentum_score"] if top else None,
                "signal_count": len(s.get("signals", [])),
            }
        )

    momentum_values = [
        i["top_momentum_score"] for i in items if i["top_momentum_score"] is not None
    ]
    rollup = {
        "investigation_count": len(items),
        "distinct_conditions": len({i["condition"] for i in items if i["condition"]}),
        "total_trials_tracked": sum(i["total_trials"] for i in items),
        "total_phase_iii": sum(i["phase_iii_count"] for i in items),
        "avg_top_momentum_score": (
            round(sum(momentum_values) / len(momentum_values), 1) if momentum_values else None
        ),
    }

    return {"investigations": items, "rollup": rollup}


def _get_user_investigation(
    investigation_id: int,
    user: User,
    db: Session,
) -> Investigation:
    inv = (
        db.query(Investigation)
        .filter(Investigation.id == investigation_id, Investigation.user_id == user.id)
        .first()
    )
    if not inv:
        raise HTTPException(404, "Investigation not found")
    return inv


@router.get("/{investigation_id}")
def get_investigation(
    investigation_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    inv = _get_user_investigation(investigation_id, user, db)
    return {
        "id": inv.id,
        "query": inv.query,
        "status": inv.status,
        "created_at": serialize_utc(inv.created_at),
        "summary": inv.summary_json,
        "followups": inv.followups_json or [],
        "debate": inv.debate_json,
        "memos": inv.memos_json or {},
    }


@router.get("/{investigation_id}/stream")
async def stream_investigation(
    investigation_id: int,
    user: Annotated[User, Depends(get_current_user_sse)],
    db: Session = Depends(get_db),
):
    inv = _get_user_investigation(investigation_id, user, db)
    check_token_budget(user, estimated_tokens=8000)

    async def event_generator():
        import json

        async for event in run_investigation(db, inv, user):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/{investigation_id}/explain-signals")
async def explain_investigation_signals(
    investigation_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    _get_user_investigation(investigation_id, user, db)
    check_token_budget(user, estimated_tokens=2000)

    async def stream():
        async for chunk in explain_signals(db, investigation_id, user):
            yield chunk

    return StreamingResponse(stream(), media_type="text/plain")


@router.post("/{investigation_id}/ask")
async def ask_investigation(
    investigation_id: int,
    body: AskRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    import json

    inv = _get_user_investigation(investigation_id, user, db)
    check_token_budget(user, estimated_tokens=3000)
    question = body.question.strip()

    async def event_generator():
        answer_parts: list[str] = []

        async for event in ask_followup(db, investigation_id, question, user):
            yield f"data: {json.dumps(event)}\n\n"
            if event.get("type") == "delta" and event.get("content"):
                answer_parts.append(event["content"])

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

        answer = "".join(answer_parts)
        save_db = SessionLocal()
        try:
            fresh = (
                save_db.query(Investigation)
                .filter(
                    Investigation.id == investigation_id,
                    Investigation.user_id == user.id,
                )
                .first()
            )
            if fresh and answer:
                followups = list(fresh.followups_json or [])
                followups.append(
                    {
                        "id": len(followups) + 1,
                        "question": question,
                        "answer": answer,
                        "created_at": serialize_utc(datetime.utcnow()),
                    }
                )
                fresh.followups_json = followups
                save_db.commit()
        finally:
            save_db.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{investigation_id}/briefing")
def get_investigation_briefing(
    investigation_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    inv = _get_user_investigation(investigation_id, user, db)
    return {"briefing": get_briefing(db, inv)}


@router.post("/{investigation_id}/debate")
async def debate_investigation(
    investigation_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    import json

    _get_user_investigation(investigation_id, user, db)
    check_token_budget(user, estimated_tokens=6000)

    async def event_generator():
        parts: dict[str, list[str]] = {"bull": [], "bear": [], "synthesis": []}

        async for event in run_debate(db, investigation_id, user):
            yield f"data: {json.dumps(event)}\n\n"
            if event.get("type") == "delta" and event.get("content"):
                parts[event["side"]].append(event["content"])

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

        save_db = SessionLocal()
        try:
            fresh = (
                save_db.query(Investigation)
                .filter(
                    Investigation.id == investigation_id,
                    Investigation.user_id == user.id,
                )
                .first()
            )
            if fresh and any(parts.values()):
                fresh.debate_json = {
                    "bull": "".join(parts["bull"]),
                    "bear": "".join(parts["bear"]),
                    "synthesis": "".join(parts["synthesis"]),
                    "created_at": serialize_utc(datetime.utcnow()),
                }
                save_db.commit()
        finally:
            save_db.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/{investigation_id}/memo")
async def draft_memo(
    investigation_id: int,
    body: MemoRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    import json

    _get_user_investigation(investigation_id, user, db)
    check_token_budget(user, estimated_tokens=2500)
    therapy_name = body.therapy_name.strip()

    async def event_generator():
        content_parts: list[str] = []

        async for chunk in draft_bd_memo(db, investigation_id, therapy_name, user):
            content_parts.append(chunk)
            yield f"data: {json.dumps({'type': 'delta', 'content': chunk})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

        content = "".join(content_parts)
        save_db = SessionLocal()
        try:
            fresh = (
                save_db.query(Investigation)
                .filter(
                    Investigation.id == investigation_id,
                    Investigation.user_id == user.id,
                )
                .first()
            )
            if fresh and content:
                memos = dict(fresh.memos_json or {})
                memos[therapy_name] = {
                    "therapy_name": therapy_name,
                    "content": content,
                    "created_at": serialize_utc(datetime.utcnow()),
                }
                fresh.memos_json = memos
                save_db.commit()
        finally:
            save_db.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _investigation_condition(inv: Investigation) -> str:
    if inv.summary_json and inv.summary_json.get("condition"):
        return inv.summary_json["condition"]
    return infer_condition(inv.query)


@router.get("/{investigation_id}/sources/{source_key}")
def get_investigation_source_data(
    investigation_id: int,
    source_key: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    inv = _get_user_investigation(investigation_id, user, db)
    condition = _investigation_condition(inv)

    if source_key == "clinical-trials":
        trials = search_trials(investigation_id, condition)
        return {
            "source": "ClinicalTrials.gov",
            "count": len(trials),
            "trials": trials,
        }

    if source_key == "pubmed":
        rankings = rank_therapies_by_momentum(investigation_id, condition, limit=6)
        publications: list[dict] = []
        for ranking in rankings:
            for publication in get_publications(
                investigation_id, ranking["name"], condition
            ):
                publications.append({**publication, "therapy": ranking["name"]})
        return {
            "source": "PubMed",
            "count": len(publications),
            "publications": publications,
        }

    if source_key == "openfda":
        rankings = rank_therapies_by_momentum(investigation_id, condition, limit=6)
        profiles = [get_safety_profile(ranking["name"]) for ranking in rankings]
        return {
            "source": "openFDA",
            "count": len(profiles),
            "profiles": profiles,
        }

    raise HTTPException(404, "Unknown source")
