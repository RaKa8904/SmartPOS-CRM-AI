from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base

class ProductPriceHistory(Base):
    __tablename__ = "product_price_history"

    id = Column(Integer, primary_key=True, index=True)

    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    old_price = Column(Float, nullable=False)
    new_price = Column(Float, nullable=False)

    changed_at = Column(DateTime(timezone=True), server_default=func.now())
