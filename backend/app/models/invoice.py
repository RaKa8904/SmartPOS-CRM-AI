from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String
from sqlalchemy.sql import func
from app.db.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)

    # GST breakdown
    subtotal = Column(Float, nullable=False, default=0.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)

    # Payment tracking
    payment_method = Column(String(20), default="cash")   # cash / card / upi / credit
    payment_status = Column(String(20), default="paid")   # paid / pending / partial
    amount_tendered = Column(Float, nullable=True)         # cash given by customer
    change_due = Column(Float, nullable=True)              # change returned

    created_at = Column(DateTime(timezone=True), server_default=func.now())
