from pydantic import BaseModel
from typing import List

class BillingItem(BaseModel):
    product_id: int
    quantity: int

class CreateInvoiceRequest(BaseModel):
    items: List[BillingItem]
