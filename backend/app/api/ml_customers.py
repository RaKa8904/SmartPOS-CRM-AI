from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.ml.customer_segmentation import segment_customers

router = APIRouter(prefix="/ml", tags=["ML"])


@router.get("/customer-segments")
def customer_segments(db: Session = Depends(get_db)):
    customers = db.query(Customer).all()

    rows = []

    for c in customers:
        invoices = db.query(Invoice).filter(
            Invoice.customer_id == c.id
        ).all()

        total_spent = sum(inv.total_amount for inv in invoices)
        total_invoices = len(invoices)

        rows.append({
            "customer_id": c.id,
            "name": c.name,
            "phone": c.phone,
            "total_spent": total_spent or 0,
            "total_invoices": total_invoices or 0
        })

    segments = segment_customers([
        {
            "customer_id": r["customer_id"],
            "total_spent": r["total_spent"],
            "total_invoices": r["total_invoices"]
        }
        for r in rows
    ])

    seg_map = {
        s["customer_id"]: s["segment"]
        for s in segments
    }

    for r in rows:
        r["segment"] = seg_map.get(r["customer_id"], "Low Value")

    return rows
