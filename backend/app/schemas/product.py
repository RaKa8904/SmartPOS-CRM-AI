from pydantic import BaseModel

class ProductCreate(BaseModel):
    name: str
    sku: str
    price: float
    stock: int = 0

class ProductOut(BaseModel):
    id: int
    name: str
    sku: str
    price: float
    stock: int

    class Config:
        from_attributes = True
