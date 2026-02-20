from sqlalchemy import Column, Integer, String, Float, Boolean
from app.db.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, nullable=False)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)

    # 🔥 Soft Delete Column
    is_active = Column(Boolean, default=True)