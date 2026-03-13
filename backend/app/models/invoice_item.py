from sqlalchemy import Column, Integer, Float, ForeignKey
from app.db.database import Base


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)

    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    quantity = Column(Integer, nullable=False)
    price_at_purchase = Column(Float, nullable=False)
    tax_rate = Column(Float, nullable=False, default=18.0)  # GST % at time of purchase
    line_total = Column(Float, nullable=False)              # pre-tax subtotal for this line
    line_tax = Column(Float, nullable=False, default=0.0)   # GST amount for this line
