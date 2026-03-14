from sqlalchemy import Boolean, Column, DateTime, Integer, String
from datetime import datetime, timezone
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String(80), nullable=False, default="")
    hashed_password = Column(String, nullable=False)
    # Role-based access: admin / manager / cashier
    role = Column(String(20), default="cashier", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    session_revoked = Column(Boolean, default=False, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    token_version = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
