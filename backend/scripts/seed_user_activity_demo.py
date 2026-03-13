import json
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.user import User

SEED_TAG = "user_activity_demo_v1"
RNG = random.Random(42)

INVOICE_TOTALS = {
    "arjun.mehta.manager@smartpos.demo": [980.0, 1120.5, 640.0, 2200.0],
    "neha.verma.manager@smartpos.demo": [860.0, 540.5, 1790.0],
    "rohit.patel.cashier@smartpos.demo": [450.0, 520.0, 870.0, 300.0, 1299.0],
    "priya.shah.cashier@smartpos.demo": [720.0, 380.0, 910.0, 430.0],
    "aman.khan.cashier@smartpos.demo": [510.0, 610.0, 740.0],
}


def _cleanup_previous_seed_logs(db):
    rows = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(3000).all()
    delete_ids = []
    for row in rows:
        if not row.details:
            continue
        try:
            payload = json.loads(row.details)
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict) and payload.get("seed_tag") == SEED_TAG:
            delete_ids.append(row.id)

    if delete_ids:
        db.query(AuditLog).filter(AuditLog.id.in_(delete_ids)).delete(synchronize_session=False)
        db.commit()


def _ensure_users_present(db):
    emails = list(INVOICE_TOTALS.keys())
    users = db.query(User).filter(User.email.in_(emails)).all()
    missing = sorted(set(emails) - {u.email for u in users})
    if missing:
        raise RuntimeError(
            "Seed users are missing. Run scripts/seed_staff_users.py first. Missing: "
            + ", ".join(missing)
        )
    return {u.email: u for u in users}


def _seed_login_activity(db, users_by_email):
    now_utc = datetime.now(timezone.utc)
    today_users = [
        "arjun.mehta.manager@smartpos.demo",
        "rohit.patel.cashier@smartpos.demo",
        "priya.shah.cashier@smartpos.demo",
        "aman.khan.cashier@smartpos.demo",
    ]

    for idx, email in enumerate(today_users):
        user = users_by_email[email]
        user.last_login_at = now_utc - timedelta(hours=idx + 1)

    # Keep one user out of today's active list.
    users_by_email["neha.verma.manager@smartpos.demo"].last_login_at = now_utc - timedelta(days=1, hours=2)

    for i in range(4):
        ts = now_utc - timedelta(minutes=7 * i)
        db.add(
            AuditLog(
                actor_email=f"intruder{i + 1}@unknown.demo",
                action="login_failed",
                entity_type="auth",
                entity_id=None,
                details=json.dumps({"reason": "invalid_password", "seed_tag": SEED_TAG}),
                created_at=ts,
            )
        )


def _seed_invoice_activity(db):
    now_utc = datetime.now(timezone.utc)
    invoice_seq = 8800

    for email, totals in INVOICE_TOTALS.items():
        for idx, amount in enumerate(totals):
            invoice_seq += 1
            created = now_utc - timedelta(minutes=RNG.randint(5, 700), days=RNG.randint(0, 2))
            db.add(
                AuditLog(
                    actor_email=email,
                    action="invoice_created",
                    entity_type="invoice",
                    entity_id=str(invoice_seq),
                    details=json.dumps(
                        {
                            "customer_id": RNG.randint(1, 12),
                            "items_count": RNG.randint(1, 6),
                            "payment_method": RNG.choice(["cash", "card", "upi"]),
                            "total_amount": round(amount, 2),
                            "seed_tag": SEED_TAG,
                        }
                    ),
                    created_at=created,
                )
            )


def _seed_account_changes(db):
    now_utc = datetime.now(timezone.utc)
    admin_email = "rahulsharma@acpce.ac.in"

    actions = [
        (
            "user_role_changed",
            "rohit.patel.cashier@smartpos.demo",
            {"old_role": "cashier", "new_role": "cashier"},
        ),
        (
            "user_status_changed",
            "aman.khan.cashier@smartpos.demo",
            {"old_is_active": True, "new_is_active": True},
        ),
        (
            "user_session_revoked",
            "priya.shah.cashier@smartpos.demo",
            {},
        ),
        (
            "user_username_changed",
            "neha.verma.manager@smartpos.demo",
            {"old_username": "Neha Verma", "new_username": "Neha Verma"},
        ),
    ]

    for i, (action, target_email, extra) in enumerate(actions):
        details = {"target_email": target_email, "seed_tag": SEED_TAG}
        details.update(extra)
        db.add(
            AuditLog(
                actor_email=admin_email,
                action=action,
                entity_type="user",
                entity_id=str(100 + i),
                details=json.dumps(details),
                created_at=now_utc - timedelta(minutes=3 * i),
            )
        )


def main():
    db = SessionLocal()
    try:
        users_by_email = _ensure_users_present(db)
        _cleanup_previous_seed_logs(db)
        _seed_login_activity(db, users_by_email)
        _seed_invoice_activity(db)
        _seed_account_changes(db)
        db.commit()

        invoice_count = db.query(AuditLog).filter(AuditLog.action == "invoice_created").count()
        failed_today = (
            db.query(AuditLog)
            .filter(
                AuditLog.action == "login_failed",
                AuditLog.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0),
            )
            .count()
        )
        active_today = (
            db.query(User)
            .filter(
                User.is_active.is_(True),
                User.last_login_at.is_not(None),
                User.last_login_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0),
            )
            .count()
        )

        print("User activity demo data seeded successfully")
        print(f"invoice_created logs total: {invoice_count}")
        print(f"failed logins today: {failed_today}")
        print(f"active users today: {active_today}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
