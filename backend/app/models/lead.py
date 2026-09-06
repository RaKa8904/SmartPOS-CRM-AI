import enum

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from app.db.database import Base


class LeadStatus(str, enum.Enum):
    NEW = "New"
    CONTACTED = "Contacted"
    DEMO_SCHEDULED = "Demo Scheduled"
    NEGOTIATING = "Negotiating"
    WON = "Won"
    LOST = "Lost"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False, index=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String(30), nullable=False, default=LeadStatus.NEW.value)
    estimated_value = Column(Float, nullable=True, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
