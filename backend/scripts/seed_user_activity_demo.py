import json
import random
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.category import Category  # noqa: F401 - needed for FK metadata
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.product import Product
from app.models.user import User

SEED_TAG = "dashboard_v2_demo_seed"
SKU_PREFIX = "RTL-"
CUSTOMER_EMAIL_PREFIX = "customer.seed"
LEGACY_SKU_PREFIXES = ["DMO-"]
LEGACY_CUSTOMER_PREFIXES = ["demo.customer"]
RNG = random.Random(20260314)

PRODUCT_CATALOG = [
    ("Basmati Rice 5kg", 425.0),
    ("Sunflower Oil 1L", 165.0),
    ("Whole Wheat Flour 10kg", 520.0),
    ("Toor Dal 1kg", 145.0),
    ("Brown Bread 400g", 55.0),
    ("Fresh Milk 1L", 68.0),
    ("Eggs Pack of 12", 96.0),
    ("Cheddar Cheese 200g", 135.0),
    ("Tomato Ketchup 500g", 120.0),
    ("Bath Soap 4x100g", 140.0),
    ("Laundry Detergent 1kg", 210.0),
    ("Green Tea 100 Bags", 280.0),
]

CUSTOMER_FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Ishaan", "Kabir", "Rohan", "Arjun", "Kunal",
    "Aditi", "Ananya", "Priya", "Riya", "Sneha", "Meera", "Kavya", "Nisha",
]
CUSTOMER_LAST_NAMES = [
    "Sharma", "Patel", "Mehta", "Verma", "Joshi", "Kapoor", "Iyer", "Nair",
    "Kulkarni", "Gupta", "Chopra", "Bose", "Desai", "Reddy", "Malhotra", "Khanna",
]

STAFF_EMAILS = [
    "arjun.mehta.manager@smartpos.demo",
    "neha.verma.manager@smartpos.demo",
    "rohit.patel.cashier@smartpos.demo",
    "priya.shah.cashier@smartpos.demo",
    "aman.khan.cashier@smartpos.demo",
]

ACTOR_WEIGHTS = {
    "arjun.mehta.manager@smartpos.demo": 0.24,
    "neha.verma.manager@smartpos.demo": 0.18,
    "rohit.patel.cashier@smartpos.demo": 0.22,
    "priya.shah.cashier@smartpos.demo": 0.20,
    "aman.khan.cashier@smartpos.demo": 0.16,
}


def _ensure_users_present(db):
    users = db.query(User).filter(User.email.in_(STAFF_EMAILS)).all()
    missing = sorted(set(STAFF_EMAILS) - {u.email for u in users})
    if missing:
        raise RuntimeError(
            "Seed users missing. Run scripts/seed_staff_users.py first. Missing: "
            + ", ".join(missing)
        )
    return {u.email: u for u in users}


def _delete_previous_seed_data(db):
    # Remove previous seeded audit rows.
    rows = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(8000).all()
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

    # Remove previous seeded customers and linked invoices/items.
    seed_customers = db.query(Customer).filter(Customer.email.is_not(None)).all()
    seed_customers = [
        c
        for c in seed_customers
        if any((c.email or "").startswith(prefix) for prefix in [CUSTOMER_EMAIL_PREFIX, *LEGACY_CUSTOMER_PREFIXES])
        or (c.name or "").startswith("Demo Customer")
    ]
    customer_ids = [c.id for c in seed_customers]
    if customer_ids:
        invoice_ids = [i.id for i in db.query(Invoice).filter(Invoice.customer_id.in_(customer_ids)).all()]
        if invoice_ids:
            db.query(InvoiceItem).filter(InvoiceItem.invoice_id.in_(invoice_ids)).delete(synchronize_session=False)
            db.query(Invoice).filter(Invoice.id.in_(invoice_ids)).delete(synchronize_session=False)
        db.query(Customer).filter(Customer.id.in_(customer_ids)).delete(synchronize_session=False)

    # Remove previous seeded products (new prefix + legacy prefix + old Demo naming pattern).
    products = db.query(Product).all()
    delete_product_ids = [
        p.id
        for p in products
        if (p.sku or "").startswith(SKU_PREFIX)
        or any((p.sku or "").startswith(prefix) for prefix in LEGACY_SKU_PREFIXES)
        or (p.name or "").startswith("Demo Product")
    ]
    if delete_product_ids:
        db.query(Product).filter(Product.id.in_(delete_product_ids)).delete(synchronize_session=False)

    db.commit()


def _seed_products(db):
    # Create intentional stock distribution for inventory risk visuals.
    stock_template = [0, 0, 2, 3, 5, 7, 9, 12, 18, 24, 30, 45]
    products = []
    for idx, ((name, base_price), stock) in enumerate(zip(PRODUCT_CATALOG, stock_template), start=1):
        products.append(
            Product(
                name=name,
                sku=f"{SKU_PREFIX}{idx:03d}",
                price=round(base_price, 2),
                stock=stock,
                tax_rate=18.0,
                is_active=True,
            )
        )
    db.add_all(products)
    db.flush()
    return products


def _seed_customers(db, now_utc):
    customers = []
    name_pool = [f"{f} {l}" for f in CUSTOMER_FIRST_NAMES for l in CUSTOMER_LAST_NAMES]
    RNG.shuffle(name_pool)

    def _customer_name(i: int) -> str:
        if i - 1 < len(name_pool):
            return name_pool[i - 1]
        return f"Customer {i}"

    # 40 customers across last 30 days + 14 today for conversion metric.
    for i in range(1, 41):
        created = now_utc - timedelta(days=RNG.randint(1, 30), hours=RNG.randint(0, 20))
        customers.append(
            Customer(
                name=_customer_name(i),
                phone=f"90077{i:05d}",
                email=f"{CUSTOMER_EMAIL_PREFIX}{i}@smartpos.demo",
                created_at=created,
            )
        )
    for j in range(41, 55):
        created = now_utc - timedelta(hours=RNG.randint(0, 12), minutes=RNG.randint(0, 59))
        customers.append(
            Customer(
                name=_customer_name(j),
                phone=f"90077{j:05d}",
                email=f"{CUSTOMER_EMAIL_PREFIX}{j}@smartpos.demo",
                created_at=created,
            )
        )
    db.add_all(customers)
    db.flush()
    return customers


def _pick_actor():
    emails = list(ACTOR_WEIGHTS.keys())
    weights = [ACTOR_WEIGHTS[e] for e in emails]
    return RNG.choices(emails, weights=weights, k=1)[0]


def _seed_invoices_and_logs(db, customers, now_utc):
    # Rich 30-day pattern with weekday peaks and business-hour bias.
    for day_back in range(30, -1, -1):
        day = now_utc - timedelta(days=day_back)
        weekday = day.weekday()
        base = 6
        if weekday in (4, 5):
            base += 5  # Fri/Sat busier
        if day_back <= 7:
            base += 4  # last week appears stronger

        invoice_count = base + RNG.randint(0, 6)
        for _ in range(invoice_count):
            hour = RNG.choices([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], weights=[2, 3, 4, 6, 7, 6, 5, 5, 7, 8, 8, 5, 3], k=1)[0]
            minute = RNG.randint(0, 59)
            second = RNG.randint(0, 59)
            created = day.replace(hour=hour, minute=minute, second=second, microsecond=0)

            subtotal = round(RNG.uniform(260.0, 3200.0), 2)
            tax_amount = round(subtotal * 0.18, 2)
            total_amount = round(subtotal + tax_amount, 2)
            customer = RNG.choice(customers)

            invoice = Invoice(
                customer_id=customer.id,
                subtotal=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                payment_method=RNG.choice(["cash", "upi", "card"]),
                payment_status="paid",
                created_at=created,
            )
            db.add(invoice)
            db.flush()

            actor_email = _pick_actor()
            db.add(
                AuditLog(
                    actor_email=actor_email,
                    action="invoice_created",
                    entity_type="invoice",
                    entity_id=str(invoice.id),
                    details=json.dumps(
                        {
                            "customer_id": customer.id,
                            "items_count": RNG.randint(1, 7),
                            "payment_method": invoice.payment_method,
                            "total_amount": total_amount,
                            "seed_tag": SEED_TAG,
                        }
                    ),
                    created_at=created,
                )
            )


def _seed_user_activity_and_alerts(db, users_by_email, now_utc):
    # Active users today for dashboard card.
    active_today = [
        "arjun.mehta.manager@smartpos.demo",
        "rohit.patel.cashier@smartpos.demo",
        "priya.shah.cashier@smartpos.demo",
        "aman.khan.cashier@smartpos.demo",
    ]
    for idx, email in enumerate(active_today):
        users_by_email[email].last_login_at = now_utc - timedelta(hours=idx + 1)
        users_by_email[email].is_active = True
    users_by_email["neha.verma.manager@smartpos.demo"].last_login_at = now_utc - timedelta(days=1, hours=3)

    # Failed login attempts (today) for security signal.
    for i in range(9):
        created = now_utc - timedelta(minutes=RNG.randint(2, 860))
        db.add(
            AuditLog(
                actor_email=f"intruder{i + 1}@unknown.demo",
                action="login_failed",
                entity_type="auth",
                entity_id=None,
                details=json.dumps({"reason": RNG.choice(["invalid_password", "email_not_found"]), "seed_tag": SEED_TAG}),
                created_at=created,
            )
        )

    # Account change events across recent days.
    admin_email = "rahulsharma@acpce.ac.in"
    action_rows = [
        ("user_role_changed", "rohit.patel.cashier@smartpos.demo", {"old_role": "cashier", "new_role": "cashier"}),
        ("user_status_changed", "aman.khan.cashier@smartpos.demo", {"old_is_active": True, "new_is_active": True}),
        ("user_session_revoked", "priya.shah.cashier@smartpos.demo", {}),
        ("user_username_changed", "neha.verma.manager@smartpos.demo", {"old_username": "Neha Verma", "new_username": "Neha Verma"}),
        ("price_updated", "product", {"product_id": 1, "old_price": 139.0, "new_price": 145.0}),
        ("product_deleted", "product", {"product_id": 3}),
        ("category_deleted", "category", {"category_id": 2}),
    ]
    for idx, (action, target_email, extra) in enumerate(action_rows):
        details = {"target_email": target_email, "seed_tag": SEED_TAG}
        details.update(extra)
        db.add(
            AuditLog(
                actor_email=admin_email,
                action=action,
                entity_type="user" if action.startswith("user_") else target_email,
                entity_id=str(400 + idx),
                details=json.dumps(details),
                created_at=now_utc - timedelta(hours=idx * 4),
            )
        )

    # Refund events for refund-rate KPI.
    for ridx in range(3):
        created = now_utc - timedelta(hours=RNG.randint(1, 10), minutes=RNG.randint(0, 55))
        db.add(
            AuditLog(
                actor_email=RNG.choice(STAFF_EMAILS),
                action="invoice_refunded",
                entity_type="invoice",
                entity_id=str(9900 + ridx),
                details=json.dumps({"reason": "customer_return", "seed_tag": SEED_TAG}),
                created_at=created,
            )
        )


def main():
    db = SessionLocal()
    try:
        now_utc = datetime.now(timezone.utc)
        users_by_email = _ensure_users_present(db)
        _delete_previous_seed_data(db)

        _seed_products(db)
        customers = _seed_customers(db, now_utc)
        _seed_invoices_and_logs(db, customers, now_utc)
        _seed_user_activity_and_alerts(db, users_by_email, now_utc)
        db.commit()

        today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        invoice_today = db.query(Invoice).filter(Invoice.created_at >= today_start).count()
        failed_today = db.query(AuditLog).filter(AuditLog.action == "login_failed", AuditLog.created_at >= today_start).count()
        customers_today = db.query(Customer).filter(Customer.created_at >= today_start).count()

        out_of_stock = db.query(Product).filter(Product.sku.like(f"{SKU_PREFIX}%"), Product.stock <= 0).count()
        low_stock = db.query(Product).filter(Product.sku.like(f"{SKU_PREFIX}%"), Product.stock > 0, Product.stock <= 10).count()

        by_actor = defaultdict(int)
        for row in db.query(AuditLog).filter(AuditLog.action == "invoice_created").all():
            by_actor[row.actor_email] += 1

        print("Dashboard v2 seed complete (realistic names)")
        print(f"Invoices today: {invoice_today}")
        print(f"Customers today: {customers_today}")
        print(f"Failed logins today: {failed_today}")
        print(f"Inventory out_of_stock: {out_of_stock}, low_stock: {low_stock}")
        print("Invoice activity by actor:")
        for email, count in sorted(by_actor.items(), key=lambda kv: kv[1], reverse=True)[:7]:
            print(f"  {email}: {count}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
