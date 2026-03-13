import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db.deps import get_db
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter(prefix="/user-activity", tags=["User Activity"])

ACCOUNT_CHANGE_ACTIONS = {
    "user_role_changed",
    "user_status_changed",
    "user_session_revoked",
    "user_username_changed",
}


def _parse_details(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


@router.get("/summary")
def user_activity_summary(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    now_utc = datetime.now(timezone.utc)
    day_start = datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc)

    active_users_today = (
        db.query(User)
        .filter(User.is_active.is_(True), User.last_login_at.is_not(None), User.last_login_at >= day_start)
        .count()
    )

    failed_login_attempts_today = (
        db.query(AuditLog)
        .filter(AuditLog.action == "login_failed", AuditLog.created_at >= day_start)
        .count()
    )

    invoice_logs = (
        db.query(AuditLog)
        .filter(AuditLog.action == "invoice_created")
        .order_by(AuditLog.id.desc())
        .limit(3000)
        .all()
    )

    per_cashier_counts: defaultdict[str, int] = defaultdict(int)
    per_cashier_totals: defaultdict[str, float] = defaultdict(float)

    for row in invoice_logs:
        cashier_email = row.actor_email or "unknown"
        details = _parse_details(row.details)
        amount = float(details.get("total_amount") or 0.0)
        per_cashier_counts[cashier_email] += 1
        per_cashier_totals[cashier_email] += amount

    invoices_per_cashier = [
        {"cashier_email": email, "invoices_count": count}
        for email, count in sorted(per_cashier_counts.items(), key=lambda kv: kv[1], reverse=True)
    ]

    top_staff_by_billing = [
        {
            "cashier_email": email,
            "total_billing": round(total, 2),
            "invoices_count": per_cashier_counts.get(email, 0),
        }
        for email, total in sorted(per_cashier_totals.items(), key=lambda kv: kv[1], reverse=True)[:5]
    ]

    recent_changes = (
        db.query(AuditLog)
        .filter(AuditLog.action.in_(ACCOUNT_CHANGE_ACTIONS))
        .order_by(AuditLog.id.desc())
        .limit(12)
        .all()
    )

    recent_account_changes = []
    for row in recent_changes:
        details = _parse_details(row.details)
        recent_account_changes.append(
            {
                "id": row.id,
                "actor_email": row.actor_email,
                "action": row.action,
                "target_email": details.get("target_email"),
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "details": details,
            }
        )

    return {
        "active_users_today": active_users_today,
        "failed_login_attempts_today": failed_login_attempts_today,
        "invoices_per_cashier": invoices_per_cashier,
        "top_staff_by_billing": top_staff_by_billing,
        "recent_account_changes": recent_account_changes,
    }
