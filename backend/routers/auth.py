from typing import Annotated

import base64

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    user_to_dict,
    verify_password,
)
from config import get_settings
from database import get_db
from models.models import AgentTrace, Investigation, User

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()

MAX_AVATAR_BYTES = 512_000
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


class SignupRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UpdateProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class DeleteAccountRequest(BaseModel):
    password: str


@router.post("/signup", response_model=AuthResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email.lower()).first()
    if existing:
        raise HTTPException(400, "Email already registered")

    user = User(
        email=body.email.lower(),
        name=body.name.strip(),
        hashed_password=hash_password(body.password),
        role="user",
        token_limit=settings.default_user_token_limit,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(
        access_token=create_access_token(user.id),
        user=user_to_dict(user),
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(403, "Account disabled")

    return AuthResponse(
        access_token=create_access_token(user.id),
        user=user_to_dict(user),
    )


@router.get("/me")
def me(user: Annotated[User, Depends(get_current_user)]):
    return user_to_dict(user)


@router.patch("/me")
def update_profile(
    body: UpdateProfileRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    user.name = body.name.strip()
    db.commit()
    db.refresh(user)
    return user_to_dict(user)


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"ok": True}


@router.post("/avatar")
async def upload_avatar(
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
):
    content_type = file.content_type or ""
    if content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(400, "Avatar must be JPEG, PNG, WebP, or GIF")

    data = await file.read()
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(400, "Avatar must be under 500 KB")

    encoded = base64.b64encode(data).decode("ascii")
    user.avatar_url = f"data:{content_type};base64,{encoded}"
    db.commit()
    db.refresh(user)
    return user_to_dict(user)


@router.delete("/avatar")
def remove_avatar(
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    user.avatar_url = None
    db.commit()
    db.refresh(user)
    return user_to_dict(user)


@router.delete("/me")
def delete_account(
    body: DeleteAccountRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(400, "Password is incorrect")

    inv_ids = [
        row[0]
        for row in db.query(Investigation.id)
        .filter(Investigation.user_id == user.id)
        .all()
    ]
    if inv_ids:
        db.query(AgentTrace).filter(AgentTrace.investigation_id.in_(inv_ids)).delete(
            synchronize_session=False
        )
        db.query(Investigation).filter(Investigation.user_id == user.id).delete(
            synchronize_session=False
        )

    db.delete(user)
    db.commit()
    return {"ok": True}
