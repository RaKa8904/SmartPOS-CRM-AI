from pydantic import BaseModel
from typing import Optional


class ProductCreate(BaseModel):
    name: str
    sku: str
    price: float
    stock: int = 0
    tax_rate: float = 18.0        # GST % (e.g. 18 = 18%)
    category_id: Optional[int] = None


class ProductOut(BaseModel):
    id: int
    name: str
    sku: str
    price: float
    stock: int
    tax_rate: float
    category_id: Optional[int] = None

    class Config:
        from_attributes = True
