from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.deps import get_db
from app.models.notification import (
    Notification,
    NotificationCampaign,
    NotificationTemplate,
)
from app.models.customer import Customer
from app.models.product import Product
from app.api.price_drops import price_drop_for_product
from app.core.email_sender import send_email
from app.core.sms_sender import send_sms
from app.core.dependencies import require_role

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class TemplateCreate(BaseModel):
    name: str
    channel: str = "EMAIL"
    subject_template: Optional[str] = None
    body_template: str


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    channel: Optional[str] = None
    subject_template: Optional[str] = None
    body_template: Optional[str] = None
    is_active: Optional[bool] = None


class CampaignCreate(BaseModel):
    name: Optional[str] = None
    template_id: Optional[int] = None
    channel: Optional[str] = "EMAIL"


def _normalize_channel(channel: str) -> str:
    value = (channel or "EMAIL").strip().upper()
    if value not in {"EMAIL", "SMS"}:
        raise HTTPException(status_code=400, detail="Channel must be EMAIL or SMS")
    return value


def _render_template(template_text: str, context: dict) -> str:
    content = template_text
    for key, value in context.items():
        content = content.replace(f"{{{key}}}", str(value))
    return content


def _build_context(customer: Customer, product: Product, old_price: float, new_price: float) -> dict:
    difference = round(max(old_price - new_price, 0), 2)
    return {
        "customer_name": customer.name,
        "product_name": product.name,
        "old_price": old_price,
        "new_price": new_price,
        "difference": difference,
    }


def _default_subject(product_name: str) -> str:
    return f"Price Drop Alert: {product_name}"


def _default_message(customer_name: str, product_name: str, old_price: float, new_price: float) -> str:
    return (
        f"Hello {customer_name},\n\n"
        f"Good news! The price of {product_name} has dropped.\n"
        f"Old Price: ₹{old_price}\n"
        f"New Price: ₹{new_price}\n\n"
        "Visit again to grab the deal!"
    )


def _send_one_notification(notification: Notification):
    if notification.channel == "SMS":
        if not notification.phone:
            raise RuntimeError("Missing phone number for SMS")
        provider_ref = send_sms(notification.phone, notification.message)
        return provider_ref

    if not notification.email:
        raise RuntimeError("Missing email address for EMAIL")

    send_email(
        to_email=notification.email,
        subject=notification.subject or "Price Drop Alert",
        body=notification.message,
    )
    return None


@router.get("/templates")
def list_templates(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    return db.query(NotificationTemplate).order_by(NotificationTemplate.created_at.desc()).all()


@router.post("/templates")
def create_template(
    payload: TemplateCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    channel = _normalize_channel(payload.channel)

    existing = (
        db.query(NotificationTemplate)
        .filter(NotificationTemplate.name == payload.name.strip())
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Template name already exists")

    template = NotificationTemplate(
        name=payload.name.strip(),
        channel=channel,
        subject_template=(payload.subject_template or "").strip() or None,
        body_template=payload.body_template,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.put("/templates/{template_id}")
def update_template(
    template_id: int,
    payload: TemplateUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    template = db.query(NotificationTemplate).filter(NotificationTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if payload.name is not None:
        template.name = payload.name.strip()
    if payload.channel is not None:
        template.channel = _normalize_channel(payload.channel)
    if payload.subject_template is not None:
        template.subject_template = (payload.subject_template or "").strip() or None
    if payload.body_template is not None:
        template.body_template = payload.body_template
    if payload.is_active is not None:
        template.is_active = payload.is_active

    db.commit()
    db.refresh(template)
    return template


@router.post("/campaigns/product/{product_id}")
def create_campaign_for_product(
    product_id: int,
    payload: CampaignCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    channel = _normalize_channel(payload.channel or "EMAIL")
    selected_template = None
    if payload.template_id is not None:
        selected_template = (
            db.query(NotificationTemplate)
            .filter(
                NotificationTemplate.id == payload.template_id,
                NotificationTemplate.is_active.is_(True),
            )
            .first()
        )
        if not selected_template:
            raise HTTPException(status_code=404, detail="Template not found or inactive")
        channel = selected_template.channel

    result = price_drop_for_product(product_id, db)
    eligible = result.get("eligible_customers", [])

    campaign_name = (payload.name or "").strip() or f"Price Drop: {product.name} ({datetime.utcnow().strftime('%Y-%m-%d %H:%M')})"
    campaign = NotificationCampaign(
        name=campaign_name,
        channel=channel,
        template_id=selected_template.id if selected_template else None,
        product_id=product_id,
        status="DRAFT",
    )
    db.add(campaign)
    db.flush()

    created = 0
    for e in eligible:
        customer_id = e["customer_id"]
        old_price = e["old_price"]
        new_price = e["current_price"]

        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            continue

        existing = (
            db.query(Notification)
            .filter(
                and_(
                    Notification.customer_id == customer_id,
                    Notification.product_id == product_id,
                    Notification.old_price == old_price,
                    Notification.new_price == new_price,
                    Notification.campaign_id == campaign.id,
                )
            )
            .first()
        )
        if existing:
            continue

        context = _build_context(customer, product, old_price, new_price)
        if selected_template:
            subject = (
                _render_template(selected_template.subject_template, context)
                if selected_template.subject_template
                else _default_subject(product.name)
            )
            message = _render_template(selected_template.body_template, context)
        else:
            subject = _default_subject(product.name)
            message = _default_message(customer.name, product.name, old_price, new_price)

        notif = Notification(
            customer_id=customer_id,
            product_id=product_id,
            campaign_id=campaign.id,
            template_id=selected_template.id if selected_template else None,
            old_price=old_price,
            new_price=new_price,
            channel=channel,
            email=customer.email,
            phone=customer.phone,
            subject=subject,
            message=message,
            status="PENDING",
        )
        db.add(notif)
        created += 1

    campaign.total_count = created
    db.commit()
    db.refresh(campaign)

    return {
        "message": "Campaign created",
        "campaign_id": campaign.id,
        "campaign_name": campaign.name,
        "created": created,
    }


@router.get("/campaigns")
def list_campaigns(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    campaigns = db.query(NotificationCampaign).order_by(NotificationCampaign.created_at.desc()).all()
    return campaigns


@router.get("/campaigns/{campaign_id}/notifications")
def list_campaign_notifications(
    campaign_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    campaign = db.query(NotificationCampaign).filter(NotificationCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return (
        db.query(Notification)
        .filter(Notification.campaign_id == campaign_id)
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.post("/campaigns/{campaign_id}/send")
def send_campaign_notifications(
    campaign_id: int,
    retry_failed: bool = Query(False),
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    campaign = db.query(NotificationCampaign).filter(NotificationCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    statuses = ["PENDING", "RETRY"]
    if retry_failed:
        statuses.append("FAILED")

    notifications = (
        db.query(Notification)
        .filter(
            Notification.campaign_id == campaign_id,
            Notification.status.in_(statuses),
        )
        .all()
    )

    if not notifications:
        return {"message": "No notifications available for sending", "sent": 0, "failed": 0}

    sent_count = 0
    failed_count = 0
    for n in notifications:
        n.last_attempt_at = datetime.utcnow()
        try:
            provider_ref = _send_one_notification(n)
            n.provider_message_id = provider_ref
            n.status = "SENT"
            n.error_message = None
            n.sent_at = datetime.utcnow()
            sent_count += 1
        except Exception as exc:
            n.status = "FAILED"
            n.error_message = str(exc)[:500]
            n.retry_count = (n.retry_count or 0) + 1
            failed_count += 1

    campaign.sent_count = (
        db.query(Notification)
        .filter(Notification.campaign_id == campaign_id, Notification.status == "SENT")
        .count()
    )
    campaign.failed_count = (
        db.query(Notification)
        .filter(Notification.campaign_id == campaign_id, Notification.status == "FAILED")
        .count()
    )

    if campaign.sent_count == campaign.total_count and campaign.total_count > 0:
        campaign.status = "SENT"
        campaign.sent_at = datetime.utcnow()
    elif campaign.sent_count > 0 and campaign.failed_count > 0:
        campaign.status = "PARTIAL"
    elif campaign.failed_count == campaign.total_count and campaign.total_count > 0:
        campaign.status = "FAILED"

    db.commit()

    return {
        "message": "Campaign send completed",
        "sent": sent_count,
        "failed": failed_count,
        "campaign_status": campaign.status,
    }


@router.post("/{notification_id}/retry")
def retry_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")

    n.status = "RETRY"
    n.last_attempt_at = datetime.utcnow()
    try:
        provider_ref = _send_one_notification(n)
        n.provider_message_id = provider_ref
        n.status = "SENT"
        n.error_message = None
        n.sent_at = datetime.utcnow()
    except Exception as exc:
        n.status = "FAILED"
        n.error_message = str(exc)[:500]
        n.retry_count = (n.retry_count or 0) + 1

    if n.campaign_id:
        campaign = db.query(NotificationCampaign).filter(NotificationCampaign.id == n.campaign_id).first()
        if campaign:
            campaign.sent_count = (
                db.query(Notification)
                .filter(Notification.campaign_id == n.campaign_id, Notification.status == "SENT")
                .count()
            )
            campaign.failed_count = (
                db.query(Notification)
                .filter(Notification.campaign_id == n.campaign_id, Notification.status == "FAILED")
                .count()
            )
            if campaign.sent_count == campaign.total_count and campaign.total_count > 0:
                campaign.status = "SENT"
            elif campaign.sent_count > 0 and campaign.failed_count > 0:
                campaign.status = "PARTIAL"
            elif campaign.failed_count == campaign.total_count and campaign.total_count > 0:
                campaign.status = "FAILED"

    db.commit()
    db.refresh(n)
    return n


@router.post("/generate/product/{product_id}")
def generate_notifications(
    product_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    return create_campaign_for_product(
        product_id=product_id,
        payload=CampaignCreate(name=None, template_id=None, channel="EMAIL"),
        db=db,
    )


@router.get("/list")
def list_notifications(
    campaign_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    query = db.query(Notification)
    if campaign_id is not None:
        query = query.filter(Notification.campaign_id == campaign_id)
    if status:
        query = query.filter(Notification.status == status.upper())
    notifs = query.order_by(Notification.created_at.desc()).all()
    return notifs


@router.post("/send/pending")
def send_pending_notifications(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    pending = db.query(Notification).filter(Notification.status.in_(["PENDING", "RETRY"])).all()

    if len(pending) == 0:
        return {"message": "No pending notifications"}

    sent_count = 0
    failed_count = 0

    for n in pending:
        n.last_attempt_at = datetime.utcnow()
        try:
            provider_ref = _send_one_notification(n)
            n.provider_message_id = provider_ref
            n.status = "SENT"
            n.error_message = None
            n.sent_at = datetime.utcnow()
            sent_count += 1
        except Exception as exc:
            n.status = "FAILED"
            n.error_message = str(exc)[:500]
            n.retry_count = (n.retry_count or 0) + 1
            failed_count += 1

    db.commit()

    return {
        "message": "Email sending completed",
        "sent": sent_count,
        "failed": failed_count
    }
