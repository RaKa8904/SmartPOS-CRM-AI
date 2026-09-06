from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func
from app.db.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False, index=True)
    industry = Column(String(80), nullable=True)
    website = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
