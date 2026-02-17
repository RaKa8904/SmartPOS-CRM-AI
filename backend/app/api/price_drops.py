from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.product import Product
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.customer import Customer

router = APIRouter(prefix="/price-drops", tags=["Price Drops"])

@router.get("/product/{product_id}")
def price_drop_for_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    current_price = product.price

    # join invoice_items -> invoices -> customers
    rows = (
        db.query(InvoiceItem, Invoice, Customer)
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .join(Customer, Customer.id == Invoice.customer_id)
        .filter(InvoiceItem.product_id == product_id)
        .all()
    )

    eligible = []
    for item, inv, cust in rows:
        if item.price_at_purchase > current_price:
            eligible.append({
                "customer_id": cust.id,
                "customer_name": cust.name,
                "phone": cust.phone,
                "email": cust.email,
                "invoice_id": inv.id,
                "old_price": item.price_at_purchase,
                "current_price": current_price,
                "difference": item.price_at_purchase - current_price
            })

    return {
        "product_id": product.id,
        "product_name": product.name,
        "current_price": current_price,
        "eligible_customers": eligible,
        "count": len(eligible)
    }
