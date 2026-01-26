from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.product import Product

router = APIRouter(prefix="/customers", tags=["Customer Analytics"])

@router.get("/{customer_id}/history")
def customer_history(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    invoices = db.query(Invoice).filter(Invoice.customer_id == customer_id).all()

    history = []
    for inv in invoices:
        items = (
            db.query(InvoiceItem, Product)
            .join(Product, Product.id == InvoiceItem.product_id)
            .filter(InvoiceItem.invoice_id == inv.id)
            .all()
        )

        inv_items = []
        for item, product in items:
            inv_items.append({
                "product_id": product.id,
                "product_name": product.name,
                "sku": product.sku,
                "quantity": item.quantity,
                "price_at_purchase": item.price_at_purchase,
                "line_total": item.line_total
            })

        history.append({
            "invoice_id": inv.id,
            "total_amount": inv.total_amount,
            "created_at": inv.created_at,
            "items": inv_items
        })

    return {
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "phone": customer.phone,
            "email": customer.email
        },
        "invoices": history
    }

@router.get("/{customer_id}/summary")
def customer_summary(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    invoices = db.query(Invoice).filter(Invoice.customer_id == customer_id).all()

    total_invoices = len(invoices)
    total_spent = sum(inv.total_amount for inv in invoices)

    return {
        "customer_id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "total_invoices": total_invoices,
        "total_spent": total_spent
    }
