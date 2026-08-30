from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_current_admin, user_to_dict
from database import get_db
from models.models import User

router = APIRouter(prefix="/api/admin", tags=["admin"])


class UpdateUserLimits(BaseModel):
    token_limit: int | None = Field(default=None, ge=1000, le=10_000_000)
    is_active: bool | None = None
    role: str | None = None


@router.get("/users")
def list_users(
    admin: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [user_to_dict(u) for u in users]


@router.patch("/users/{user_id}")
def update_user_limits(
    user_id: int,
    body: UpdateUserLimits,
    admin: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id and body.is_active is False:
        raise HTTPException(400, "Cannot disable your own account")

    if body.token_limit is not None:
        user.token_limit = body.token_limit
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.role is not None:
        if body.role not in ("user", "admin"):
            raise HTTPException(400, "Role must be user or admin")
        user.role = body.role

    db.commit()
    db.refresh(user)
    return user_to_dict(user)


@router.post("/users/{user_id}/reset-usage")
def reset_user_usage(
    user_id: int,
    admin: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.tokens_used = 0
    db.commit()
    return user_to_dict(user)
