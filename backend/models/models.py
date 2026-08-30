from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    trial_count: Mapped[int] = mapped_column(Integer, default=0)

    therapies: Mapped[list["Therapy"]] = relationship(back_populates="company")
    trials: Mapped[list["ClinicalTrial"]] = relationship(back_populates="sponsor")


class Therapy(Base):
    __tablename__ = "therapies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    mechanism: Mapped[Optional[str]] = mapped_column(String(200))
    company_id: Mapped[Optional[int]] = mapped_column(ForeignKey("companies.id"))
    fda_approved: Mapped[bool] = mapped_column(default=False)
    momentum_score: Mapped[float] = mapped_column(Float, default=0.0)

    company: Mapped[Optional["Company"]] = relationship(back_populates="therapies")
    trials: Mapped[list["ClinicalTrial"]] = relationship(back_populates="therapy")
    publications: Mapped[list["Publication"]] = relationship(back_populates="therapy")
    adverse_events: Mapped[list["AdverseEvent"]] = relationship(back_populates="therapy")


class ClinicalTrial(Base):
    __tablename__ = "clinical_trials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nct_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    phase: Mapped[Optional[str]] = mapped_column(String(50))
    status: Mapped[Optional[str]] = mapped_column(String(100))
    sponsor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("companies.id"))
    therapy_id: Mapped[Optional[int]] = mapped_column(ForeignKey("therapies.id"))
    enrollment: Mapped[Optional[int]] = mapped_column(Integer)
    start_date: Mapped[Optional[str]] = mapped_column(String(20))
    condition: Mapped[Optional[str]] = mapped_column(String(500))

    sponsor: Mapped[Optional["Company"]] = relationship(back_populates="trials")
    therapy: Mapped[Optional["Therapy"]] = relationship(back_populates="trials")


class Publication(Base):
    __tablename__ = "publications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pmid: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    abstract: Mapped[Optional[str]] = mapped_column(Text)
    therapy_id: Mapped[Optional[int]] = mapped_column(ForeignKey("therapies.id"))
    pub_date: Mapped[Optional[str]] = mapped_column(String(20))

    therapy: Mapped[Optional["Therapy"]] = relationship(back_populates="publications")


class AdverseEvent(Base):
    __tablename__ = "adverse_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    therapy_id: Mapped[int] = mapped_column(ForeignKey("therapies.id"), nullable=False)
    reaction: Mapped[str] = mapped_column(String(300), nullable=False)
    count: Mapped[int] = mapped_column(Integer, default=0)

    therapy: Mapped["Therapy"] = relationship(back_populates="adverse_events")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user")
    token_limit: Mapped[int] = mapped_column(Integer, default=100_000)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    investigations: Mapped[list["Investigation"]] = relationship(back_populates="user")


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    query: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    summary_json: Mapped[Optional[dict]] = mapped_column(JSON)
    followups_json: Mapped[Optional[list]] = mapped_column(JSON, default=None)
    debate_json: Mapped[Optional[dict]] = mapped_column(JSON, default=None)
    memos_json: Mapped[Optional[dict]] = mapped_column(JSON, default=None)

    user: Mapped[Optional["User"]] = relationship(back_populates="investigations")
    traces: Mapped[list["AgentTrace"]] = relationship(back_populates="investigation")


class AgentTrace(Base):
    __tablename__ = "agent_traces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    investigation_id: Mapped[int] = mapped_column(ForeignKey("investigations.id"), nullable=False)
    step: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="complete")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    investigation: Mapped["Investigation"] = relationship(back_populates="traces")
