from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    old_price = Column(Float, nullable=False)
    new_price = Column(Float, nullable=False)

    email = Column(String, nullable=True)
    message = Column(String, nullable=False)

    status = Column(String, nullable=False, default="PENDING")  # PENDING / SENT / FAILED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)
