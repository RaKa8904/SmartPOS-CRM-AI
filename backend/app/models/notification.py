from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.db.database import Base


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False, unique=True, index=True)
    channel = Column(String(20), nullable=False, default="EMAIL")  # EMAIL / SMS
    subject_template = Column(String(255), nullable=True)
    body_template = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class NotificationCampaign(Base):
    __tablename__ = "notification_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, index=True)
    channel = Column(String(20), nullable=False, default="EMAIL")
    template_id = Column(Integer, ForeignKey("notification_templates.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    status = Column(String(20), nullable=False, default="DRAFT")  # DRAFT / SENT / PARTIAL / FAILED
    total_count = Column(Integer, nullable=False, default=0)
    sent_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("notification_campaigns.id"), nullable=True, index=True)
    template_id = Column(Integer, ForeignKey("notification_templates.id"), nullable=True)

    old_price = Column(Float, nullable=False)
    new_price = Column(Float, nullable=False)

    channel = Column(String(20), nullable=False, default="EMAIL")
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    subject = Column(String(255), nullable=True)
    message = Column(String, nullable=False)
    provider_message_id = Column(String(255), nullable=True)
    error_message = Column(String(500), nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)

    status = Column(String, nullable=False, default="PENDING")  # PENDING / SENT / FAILED / RETRY
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
