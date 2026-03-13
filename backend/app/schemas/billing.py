from pydantic import BaseModel
from typing import List, Optional


class BillingItem(BaseModel):
    product_id: int
    quantity: int


class CreateInvoiceRequest(BaseModel):
    customer_id: Optional[int] = None
    items: List[BillingItem]
    payment_method: str = "cash"          # cash / card / upi / credit
    amount_tendered: Optional[float] = None  # cash given (for cash payments)
