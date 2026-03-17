import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.core.dependencies import require_role
from app.core.email_sender import send_email
from app.db.deps import get_db
from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.notification import Notification, NotificationCampaign
from app.models.price_history import ProductPriceHistory, ScheduledPriceChange
from app.models.product import Product

router = APIRouter(prefix="/pricing", tags=["Pricing"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---- Request Schemas ----

class UpdatePriceRequest(BaseModel):
    product_id: int
    new_price: float


class BulkUpdateRequest(BaseModel):
    product_ids: List[int]
    mode: str   # "flat" | "percent_add"
    value: float


class ScheduleCreateRequest(BaseModel):
    product_id: int
    new_price: float
    scheduled_at: datetime
    note: Optional[str] = None


# ---- Endpoints ----

@router.post("/update")
def update_price(
    payload: UpdatePriceRequest,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "manager")),
):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.new_price <= 0:
        raise HTTPException(status_code=400, detail="Price must be > 0")

    old_price = product.price
    if old_price == payload.new_price:
        return {"message": "Price unchanged", "product_id": product.id, "price": product.price}

    db.add(ProductPriceHistory(product_id=product.id, old_price=old_price, new_price=payload.new_price))
    product.price = payload.new_price
    write_audit_log(
        db, actor_email=current["email"], action="price_updated",
        entity_type="product", entity_id=str(product.id),
        details={"product_name": product.name, "old_price": old_price, "new_price": payload.new_price},
    )
    db.commit()
    return {"message": "Price updated successfully ✅", "product_id": product.id,
            "old_price": old_price, "new_price": payload.new_price}


@router.get("/history/{product_id}")
def get_price_history(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    records = (
        db.query(ProductPriceHistory)
        .filter(ProductPriceHistory.product_id == product_id)
        .order_by(ProductPriceHistory.changed_at.asc())
        .all()
    )
    rows: list = [
        {"id": r.id, "old_price": r.old_price, "new_price": r.new_price,
         "changed_at": r.changed_at.isoformat() if r.changed_at else None}
        for r in records
    ]
    # Append sentinel representing the current live price
    rows.append({"id": None, "old_price": product.price, "new_price": product.price,
                 "changed_at": None, "is_current": True})
    return rows


@router.post("/bulk-update")
def bulk_update_prices(
    payload: BulkUpdateRequest,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "manager")),
):
    if not payload.product_ids:
        raise HTTPException(status_code=400, detail="No products selected")
    if payload.mode not in ("flat", "percent_add"):
        raise HTTPException(status_code=400, detail="mode must be 'flat' or 'percent_add'")

    results = []
    for pid in payload.product_ids:
        product = db.query(Product).filter(Product.id == pid).first()
        if not product:
            results.append({"product_id": pid, "status": "not_found"})
            continue
        old_price = product.price
        new_price = (
            payload.value if payload.mode == "flat"
            else round(old_price * (1 + payload.value / 100), 2)
        )
        if new_price <= 0:
            results.append({"product_id": pid, "product_name": product.name,
                            "status": "skipped", "reason": "computed price <= 0"})
            continue
        if old_price == new_price:
            results.append({"product_id": pid, "product_name": product.name,
                            "old_price": old_price, "new_price": new_price, "status": "unchanged"})
            continue
        db.add(ProductPriceHistory(product_id=product.id, old_price=old_price, new_price=new_price))
        product.price = new_price
        write_audit_log(
            db, actor_email=current["email"], action="price_updated",
            entity_type="product", entity_id=str(product.id),
            details={"product_name": product.name, "old_price": old_price,
                     "new_price": new_price, "bulk": True},
        )
        results.append({"product_id": pid, "product_name": product.name,
                        "old_price": old_price, "new_price": new_price, "status": "updated"})
    db.commit()
    return {"results": results, "updated": sum(1 for r in results if r["status"] == "updated")}


@router.get("/audit")
def get_price_audit(
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.action == "price_updated")
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    rows = []
    for log in logs:
        details: dict = {}
        if log.details:
            try:
                details = json.loads(log.details)
            except Exception:
                pass
        rows.append({
            "id": log.id,
            "actor_email": log.actor_email,
            "product_id": log.entity_id,
            "product_name": details.get("product_name"),
            "old_price": details.get("old_price"),
            "new_price": details.get("new_price"),
            "bulk": details.get("bulk", False),
            "scheduled": details.get("scheduled", False),
            "changed_at": log.created_at.isoformat() if log.created_at else None,
        })
    return rows


@router.post("/notify-product/{product_id}")
def notify_product_customers(
    product_id: int,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "manager")),
):
    from app.api.price_drops import price_drop_for_product  # local import avoids circular

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    drop_result = price_drop_for_product(product_id, db)
    eligible = drop_result.get("eligible_customers", [])
    if not eligible:
        return {"message": "No eligible customers to notify", "sent": 0, "failed": 0, "eligible": 0}

    campaign_name = (
        f"Price Drop: {product.name} "
        f"({datetime.utcnow().strftime('%Y-%m-%d %H:%M')})"
    )
    campaign = NotificationCampaign(
        name=campaign_name, channel="EMAIL",
        product_id=product_id, status="DRAFT",
        total_count=len(eligible),
    )
    db.add(campaign)
    db.flush()

    sent = 0
    failed = 0
    for e in eligible:
        customer = db.query(Customer).filter(Customer.id == e["customer_id"]).first()
        if not customer:
            continue
        old_p, new_p = e["old_price"], e["current_price"]
        subject = f"Price Drop Alert: {product.name}"
        message = (
            f"Hello {customer.name},\n\n"
            f"Good news! The price of {product.name} has dropped.\n"
            f"Old Price: \u20b9{old_p}\nNew Price: \u20b9{new_p}\n\n"
            "Visit us to grab the deal!"
        )
        notif = Notification(
            customer_id=customer.id, product_id=product_id, campaign_id=campaign.id,
            old_price=old_p, new_price=new_p, channel="EMAIL",
            email=customer.email, phone=customer.phone,
            subject=subject, message=message, status="PENDING",
        )
        db.add(notif)
        db.flush()
        try:
            if customer.email:
                send_email(to_email=customer.email, subject=subject, body=message)
            notif.status = "SENT"
            sent += 1
        except Exception as exc:
            notif.status = "FAILED"
            notif.error_message = str(exc)[:500]
            failed += 1

    campaign.sent_count = sent
    campaign.failed_count = failed
    campaign.status = "SENT" if failed == 0 else ("PARTIAL" if sent > 0 else "FAILED")
    db.commit()
    return {"message": "Notifications dispatched", "campaign_id": campaign.id,
            "eligible": len(eligible), "sent": sent, "failed": failed}


@router.get("/scheduled")
def list_scheduled(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    rows = (
        db.query(ScheduledPriceChange, Product)
        .join(Product, Product.id == ScheduledPriceChange.product_id)
        .filter(
            ScheduledPriceChange.applied_at.is_(None),
            ScheduledPriceChange.cancelled_at.is_(None),
        )
        .order_by(ScheduledPriceChange.scheduled_at.asc())
        .all()
    )
    return [
        {
            "id": s.id, "product_id": s.product_id, "product_name": p.name,
            "current_price": p.price, "new_price": s.new_price,
            "scheduled_at": s.scheduled_at.isoformat() if s.scheduled_at else None,
            "note": s.note, "created_by_email": s.created_by_email,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s, p in rows
    ]


@router.post("/scheduled")
def create_scheduled(
    payload: ScheduleCreateRequest,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "manager")),
):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.new_price <= 0:
        raise HTTPException(status_code=400, detail="Price must be > 0")

    sched_at = payload.scheduled_at
    if sched_at.tzinfo is None:
        sched_at = sched_at.replace(tzinfo=timezone.utc)
    if sched_at <= _utcnow():
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")

    scheduled = ScheduledPriceChange(
        product_id=payload.product_id, new_price=payload.new_price,
        scheduled_at=sched_at, created_by_email=current["email"], note=payload.note,
    )
    db.add(scheduled)
    db.commit()
    db.refresh(scheduled)
    return {"id": scheduled.id, "product_id": scheduled.product_id,
            "new_price": scheduled.new_price,
            "scheduled_at": scheduled.scheduled_at.isoformat(), "note": scheduled.note}


@router.delete("/scheduled/{scheduled_id}")
def cancel_scheduled(
    scheduled_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    s = db.query(ScheduledPriceChange).filter(ScheduledPriceChange.id == scheduled_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Scheduled change not found")
    if s.applied_at or s.cancelled_at:
        raise HTTPException(status_code=400, detail="Already applied or cancelled")
    s.cancelled_at = _utcnow()
    db.commit()
    return {"message": "Scheduled change cancelled"}


@router.post("/process-scheduled")
def process_scheduled_changes(
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "manager")),
):
    now = _utcnow()
    due = (
        db.query(ScheduledPriceChange)
        .filter(
            ScheduledPriceChange.scheduled_at <= now,
            ScheduledPriceChange.applied_at.is_(None),
            ScheduledPriceChange.cancelled_at.is_(None),
        )
        .all()
    )
    applied = []
    for s in due:
        product = db.query(Product).filter(Product.id == s.product_id).first()
        if not product:
            continue
        old_price = product.price
        product.price = s.new_price
        s.applied_at = now
        db.add(ProductPriceHistory(product_id=product.id, old_price=old_price, new_price=s.new_price))
        write_audit_log(
            db, actor_email=s.created_by_email, action="price_updated",
            entity_type="product", entity_id=str(product.id),
            details={"product_name": product.name, "old_price": old_price,
                     "new_price": s.new_price, "scheduled": True},
        )
        applied.append({"product_id": product.id, "product_name": product.name, "new_price": s.new_price})
    db.commit()
    return {"applied": len(applied), "changes": applied}
