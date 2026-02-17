from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime

from app.db.deps import get_db
from app.models.notification import Notification
from app.models.customer import Customer
from app.models.product import Product
from app.api.price_drops import price_drop_for_product
from app.core.email_sender import send_email

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/generate/product/{product_id}")
def generate_notifications(product_id: int, db: Session = Depends(get_db)):
    # reuse price drop logic output
    result = price_drop_for_product(product_id, db)

    eligible = result["eligible_customers"]
    if len(eligible) == 0:
        return {"message": "No eligible customers found", "created": 0}

    created = 0

    for e in eligible:
        customer_id = e["customer_id"]
        old_price = e["old_price"]
        new_price = e["current_price"]

        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        product = db.query(Product).filter(Product.id == product_id).first()

        if not customer or not product:
            continue

        # avoid duplicates (same customer + product + old/new price)
        existing = db.query(Notification).filter(
            and_(
                Notification.customer_id == customer_id,
                Notification.product_id == product_id,
                Notification.old_price == old_price,
                Notification.new_price == new_price,
            )
        ).first()

        if existing:
            continue

        message = (
            f"Hello {customer.name},\n\n"
            f"Good news! The price of {product.name} has dropped.\n"
            f"Old Price: ₹{old_price}\n"
            f"New Price: ₹{new_price}\n\n"
            f"Visit again to grab the deal! 🔥\n"
        )

        notif = Notification(
            customer_id=customer_id,
            product_id=product_id,
            old_price=old_price,
            new_price=new_price,
            email=customer.email,
            message=message,
            status="PENDING"
        )
        db.add(notif)
        created += 1

    db.commit()
    return {"message": "Notifications generated ✅", "created": created}


@router.get("/list")
def list_notifications(db: Session = Depends(get_db)):
    notifs = db.query(Notification).order_by(Notification.created_at.desc()).all()
    return notifs


@router.post("/send/pending")
def send_pending_notifications(db: Session = Depends(get_db)):
    pending = db.query(Notification).filter(Notification.status == "PENDING").all()

    if len(pending) == 0:
        return {"message": "No pending notifications"}

    sent_count = 0
    failed_count = 0

    for n in pending:
        if not n.email:
            n.status = "FAILED"
            failed_count += 1
            continue

        try:
            send_email(
                to_email=n.email,
                subject="📉 Price Drop Alert!",
                body=n.message
            )
            n.status = "SENT"
            n.sent_at = datetime.utcnow()
            sent_count += 1
        except Exception:
            n.status = "FAILED"
            failed_count += 1

    db.commit()

    return {
        "message": "Email sending completed",
        "sent": sent_count,
        "failed": failed_count
    }
