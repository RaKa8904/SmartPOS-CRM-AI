from pydantic import BaseModel
from typing import Optional

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None

class CustomerOut(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None

    class Config:
        from_attributes = True
