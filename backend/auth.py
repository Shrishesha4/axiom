from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import get_settings
from database import get_db
from models.models import User
from serialization import serialize_utc

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _user_from_token(token: str, db: Session) -> User:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return _user_from_token(credentials.credentials, db)


def get_current_user_sse(
    token: Annotated[str | None, Query()] = None,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)] = None,
    db: Session = Depends(get_db),
) -> User:
    if credentials:
        return _user_from_token(credentials.credentials, db)
    if token:
        return _user_from_token(token, db)
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")


def get_current_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user


def check_token_budget(user: User, estimated_tokens: int = 0) -> None:
    if user.role == "admin":
        return
    if user.tokens_used + estimated_tokens > user.token_limit:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            f"Token limit reached ({user.tokens_used:,} / {user.token_limit:,}). "
            "Contact your administrator.",
        )


def record_token_usage(db: Session, user: User, tokens: int) -> None:
    if tokens <= 0:
        return
    # Re-query in the active session — FastAPI may bind `user` and `db` to
    # different sessions when both use Depends(get_db).
    db_user = db.get(User, user.id)
    if not db_user:
        return
    db_user.tokens_used += tokens
    db.commit()


def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "avatar_url": user.avatar_url,
        "token_limit": user.token_limit,
        "tokens_used": user.tokens_used,
        "tokens_remaining": max(0, user.token_limit - user.tokens_used),
        "is_active": user.is_active,
        "has_password": bool(user.hashed_password),
        "auth_provider": "google" if user.google_id else "password",
        "created_at": serialize_utc(user.created_at),
    }
