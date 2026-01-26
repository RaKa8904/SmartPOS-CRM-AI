from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.product import Product
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.schemas.billing import CreateInvoiceRequest

router = APIRouter(prefix="/billing", tags=["Billing"])

@router.post("/create")
def create_invoice(payload: CreateInvoiceRequest, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="No items provided")

    invoice = Invoice(total_amount=0.0)
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    total = 0.0

    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be > 0")

        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for {product.name}")

        # reduce stock
        product.stock -= item.quantity

        line_total = product.price * item.quantity
        total += line_total

        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=product.id,
            quantity=item.quantity,
            price_at_purchase=product.price,
            line_total=line_total
        )
        db.add(invoice_item)

    invoice.total_amount = total
    db.commit()

    return {
        "invoice_id": invoice.id,
        "total_amount": total,
        "message": "Invoice created successfully ✅"
    }
