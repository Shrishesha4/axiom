from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate()
    _seed_admin()


def _migrate():
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE investigations "
                "ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE investigations "
                "ADD COLUMN IF NOT EXISTS followups_json JSONB DEFAULT '[]'::jsonb"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE investigations "
                "ADD COLUMN IF NOT EXISTS debate_json JSONB DEFAULT NULL"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE investigations "
                "ADD COLUMN IF NOT EXISTS memos_json JSONB DEFAULT '{}'::jsonb"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL"
            )
        )


def _seed_admin():
    from auth import hash_password
    from config import get_settings as get_cfg
    from models.models import User

    cfg = get_cfg()
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == cfg.admin_email.lower()).first()
        if not admin:
            admin = User(
                email=cfg.admin_email.lower(),
                name=cfg.admin_name,
                hashed_password=hash_password(cfg.admin_password),
                role="admin",
                token_limit=10_000_000,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()
