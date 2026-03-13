from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from app.db.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, nullable=False)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)

    # GST tax rate in percent (e.g. 18.0 = 18%)
    tax_rate = Column(Float, default=18.0, nullable=False)

    # Category (FK to categories table)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    # Soft Delete Column
    is_active = Column(Boolean, default=True)