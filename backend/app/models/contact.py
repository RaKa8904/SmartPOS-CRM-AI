from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func
from app.db.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone = Column(String(30), nullable=True)
    designation = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
