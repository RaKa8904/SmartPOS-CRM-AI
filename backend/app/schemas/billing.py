from pydantic import BaseModel
from typing import List, Optional

class BillingItem(BaseModel):
    product_id: int
    quantity: int

class CreateInvoiceRequest(BaseModel):
    customer_id: Optional[int] = None
    items: List[BillingItem]
