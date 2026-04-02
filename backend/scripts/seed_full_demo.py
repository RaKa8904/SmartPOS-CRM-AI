"""
SmartPOS CRM AI – Comprehensive 30-Day Demo Data Seeder
=======================================================
Seeds realistic data across ALL application modules:
  • Categories & Products (including new items, out-of-stock & low-stock situations)
  • Customers (mix of VIP, regular, and new walk-ins)
  • Invoices & InvoiceItems (varied payment methods across 30 days)
  • Price history (price changes with audit trail)
  • Notifications & campaigns
  • Audit logs (user activity, login events, admin actions, refunds)
  • User last_login_at updates

Run:  python -m scripts.seed_full_demo     (from backend/)
  OR: venv/Scripts/python.exe scripts/seed_full_demo.py
"""

from __future__ import annotations

import json
import math
import random
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Tuple

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.category import Category
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.notification import Notification, NotificationCampaign, NotificationTemplate
from app.models.price_history import ProductPriceHistory, ScheduledPriceChange
from app.models.product import Product
from app.models.user import User

RNG = random.Random(20260402)
SEED_TAG = "full_demo_seed_v2"

# ──────────────────────────────────────────────────────────────
# Staff accounts
# ──────────────────────────────────────────────────────────────
STAFF_USERS = [
    {"email": "arjun.mehta.manager@smartpos.demo",  "username": "Arjun Mehta",  "role": "manager",  "password": "Manager@123"},
    {"email": "neha.verma.manager@smartpos.demo",   "username": "Neha Verma",   "role": "manager",  "password": "Manager@123"},
    {"email": "rohit.patel.cashier@smartpos.demo",  "username": "Rohit Patel",  "role": "cashier",  "password": "Cashier@123"},
    {"email": "priya.shah.cashier@smartpos.demo",   "username": "Priya Shah",   "role": "cashier",  "password": "Cashier@123"},
    {"email": "aman.khan.cashier@smartpos.demo",    "username": "Aman Khan",    "role": "cashier",  "password": "Cashier@123"},
]

STAFF_EMAILS = [u["email"] for u in STAFF_USERS]
ACTOR_WEIGHTS = {
    "arjun.mehta.manager@smartpos.demo": 0.24,
    "neha.verma.manager@smartpos.demo": 0.18,
    "rohit.patel.cashier@smartpos.demo": 0.22,
    "priya.shah.cashier@smartpos.demo": 0.20,
    "aman.khan.cashier@smartpos.demo": 0.16,
}

# ──────────────────────────────────────────────────────────────
# Category & Product catalog  (12 categories, 50 products)
# ──────────────────────────────────────────────────────────────
CATEGORIES = [
    "Beverages", "Snacks", "Dairy & Bakery", "Instant Meals",
    "Personal Care", "Home & Cleaning", "Stationery", "Frozen Foods",
    "Health & Wellness", "Electronics Accessories", "Spices & Condiments",
    "Baby & Kids",
]

# (name, sku, category, price, tax_rate, initial_stock)
PRODUCTS: List[Tuple[str, str, str, float, float, int]] = [
    # Beverages (5)
    ("Mineral Water 1L",        "BEV-WTR-1L",   "Beverages",       20.0,  5.0,  300),
    ("Cold Coffee Can",         "BEV-CCF-200",   "Beverages",       55.0, 12.0,  200),
    ("Mango Juice 1L",          "BEV-MNG-1L",    "Beverages",      110.0, 12.0,  150),
    ("Energy Drink 250ml",      "BEV-ENG-250",   "Beverages",       85.0, 12.0,  160),
    ("Coconut Water 330ml",     "BEV-COC-330",   "Beverages",       40.0,  5.0,  220),
    # Snacks (5)
    ("Salted Chips 52g",        "SNK-CHP-052",   "Snacks",          20.0, 12.0,  300),
    ("Chocolate Bar",           "SNK-CHO-045",   "Snacks",          30.0, 12.0,  250),
    ("Protein Cookies",         "SNK-PRC-120",   "Snacks",          65.0, 12.0,  180),
    ("Roasted Peanuts 150g",    "SNK-PNT-150",   "Snacks",          35.0, 12.0,  200),
    ("Trail Mix 200g",          "SNK-TRL-200",   "Snacks",          95.0, 12.0,  140),
    # Dairy & Bakery (5)
    ("Whole Wheat Bread",       "DBY-BRD-400",   "Dairy & Bakery",  50.0,  5.0,  180),
    ("Toned Milk 500ml",        "DBY-MLK-500",   "Dairy & Bakery",  30.0,  5.0,  250),
    ("Cheese Slices 200g",      "DBY-CHS-200",   "Dairy & Bakery", 125.0, 12.0,  120),
    ("Butter 100g",             "DBY-BTR-100",   "Dairy & Bakery",  55.0, 12.0,  130),
    ("Paneer 200g",             "DBY-PNR-200",   "Dairy & Bakery", 100.0,  5.0,  110),
    # Instant Meals (4)
    ("Masala Noodles",          "IMS-NDL-070",   "Instant Meals",   18.0,  5.0,  350),
    ("Ready Upma Cup",          "IMS-UPM-070",   "Instant Meals",   45.0, 12.0,  180),
    ("Tomato Ketchup 500g",     "IMS-KTC-500",   "Instant Meals",   90.0, 12.0,  130),
    ("Instant Poha Cup",        "IMS-POH-070",   "Instant Meals",   45.0, 12.0,  160),
    # Personal Care (5)
    ("Toothpaste 150g",         "PCL-TPT-150",   "Personal Care",   75.0, 18.0,  200),
    ("Shampoo Sachet",          "PCL-SHM-008",   "Personal Care",    3.0, 18.0, 1000),
    ("Hand Wash 250ml",         "PCL-HWS-250",   "Personal Care",   95.0, 18.0,  180),
    ("Face Wash 100ml",         "PCL-FCW-100",   "Personal Care",  120.0, 18.0,  150),
    ("Sunscreen 50ml",          "PCL-SUN-050",   "Personal Care",  180.0, 18.0,  100),
    # Home & Cleaning (4)
    ("Dishwash Liquid 500ml",   "HCL-DSW-500",   "Home & Cleaning",110.0, 18.0,  150),
    ("Floor Cleaner 1L",        "HCL-FCL-1L",    "Home & Cleaning",165.0, 18.0,  120),
    ("Laundry Detergent 1kg",   "HCL-DTG-1K",    "Home & Cleaning",210.0, 18.0,  150),
    ("Glass Cleaner 500ml",     "HCL-GCL-500",   "Home & Cleaning", 85.0, 18.0,  130),
    # Stationery (3)
    ("Notebook A5",             "STN-NBK-A5",    "Stationery",      45.0, 12.0,  160),
    ("Blue Pen Pack (5)",       "STN-PEN-5P",    "Stationery",      50.0, 12.0,  180),
    ("Sticky Notes 100pk",      "STN-STK-100",   "Stationery",      40.0, 12.0,  200),
    # Frozen Foods (4)
    ("Frozen Peas 500g",        "FRZ-PEA-500",   "Frozen Foods",    65.0,  5.0,  150),
    ("Ice Cream Vanilla 500ml", "FRZ-ICE-500",   "Frozen Foods",   145.0, 12.0,  100),
    ("Frozen Corn 400g",        "FRZ-CRN-400",   "Frozen Foods",    75.0,  5.0,  130),
    ("Frozen Paratha Pack",     "FRZ-PRT-400",   "Frozen Foods",    80.0,  5.0,  120),
    # Health & Wellness (5)
    ("Rolled Oats 500g",        "HLT-OAT-500",   "Health & Wellness",120.0, 5.0, 160),
    ("Raw Honey 250g",          "HLT-HNY-250",   "Health & Wellness",185.0, 5.0, 110),
    ("Green Tea 25 Bags",       "HLT-GTH-025",   "Health & Wellness", 95.0,12.0, 140),
    ("Protein Bar 60g",         "HLT-PBR-060",   "Health & Wellness", 55.0,18.0, 200),
    ("Multivitamin 30 Tabs",    "HLT-MVT-030",   "Health & Wellness",250.0,12.0,  90),
    # Electronics Accessories (4)
    ("USB-C Cable 1m",          "ELC-USB-1M",    "Electronics Accessories",250.0,18.0, 180),
    ("Wired Earphones",         "ELC-EAR-W01",   "Electronics Accessories",399.0,18.0, 120),
    ("Phone Stand",             "ELC-STD-001",   "Electronics Accessories",199.0,18.0, 120),
    ("Screen Wipes 20-pack",    "ELC-WIP-020",   "Electronics Accessories", 45.0,18.0, 160),
    # Spices & Condiments (3) — NEW category
    ("Turmeric Powder 200g",    "SPC-TRM-200",   "Spices & Condiments",    55.0, 5.0, 180),
    ("Red Chilli Powder 200g",  "SPC-CHL-200",   "Spices & Condiments",    65.0, 5.0, 170),
    ("Garam Masala 100g",       "SPC-GRM-100",   "Spices & Condiments",    80.0, 5.0, 150),
    # Baby & Kids (3) — NEW category
    ("Baby Diapers Pack 30",    "BBY-DPR-030",   "Baby & Kids",           450.0,12.0,  80),
    ("Baby Wipes 72pk",         "BBY-WPS-072",   "Baby & Kids",           120.0,12.0, 140),
    ("Kids Cereal 300g",        "BBY-CRL-300",   "Baby & Kids",           180.0,12.0, 100),
]

# ──────────────────────────────────────────────────────────────
# Customer pool  (35 customers)
# ──────────────────────────────────────────────────────────────
CUSTOMERS_DATA = [
    # VIP tier (3)
    ("Vikram Mehta",     "9876500013", "vikram.mehta@smartposdemo.com"),
    ("Dev Kapoor",       "9876500026", "dev.kapoor@smartposdemo.com"),
    ("Sunita Bose",      "9876500027", "sunita.bose@smartposdemo.com"),
    # High Value tier (7)
    ("Rahul Sharma",     "9876500011", "rahul.sharma@smartposdemo.com"),
    ("Ananya Verma",     "9876500012", "ananya.verma@smartposdemo.com"),
    ("Priya Nair",       "9876500014", "priya.nair@smartposdemo.com"),
    ("Karan Malhotra",   "9876500019", "karan.malhotra@smartposdemo.com"),
    ("Aarav Gupta",      "9876500028", "aarav.gupta@smartposdemo.com"),
    ("Ravi Krishnan",    "9876500029", "ravi.krishnan@smartposdemo.com"),
    ("Meera Joshi",      "9876500030", "meera.joshi@smartposdemo.com"),
    # Regular tier (10)
    ("Arjun Patel",      "9876500015", "arjun.patel@smartposdemo.com"),
    ("Neha Singh",       "9876500016", "neha.singh@smartposdemo.com"),
    ("Pooja Menon",      "9876500020", "pooja.menon@smartposdemo.com"),
    ("Farhan Ali",       "9876500031", "farhan.ali@smartposdemo.com"),
    ("Divya Chaudhary",  "9876500032", "divya.chaudhary@smartposdemo.com"),
    ("Sneha Iyer",       "9876500018", "sneha.iyer@smartposdemo.com"),
    ("Yash Mehta",       "9876500033", "yash.mehta@smartposdemo.com"),
    ("Tanvi Deshmukh",   "9876500041", "tanvi.deshmukh@smartposdemo.com"),
    ("Siddharth Rao",    "9876500042", "siddharth.rao@smartposdemo.com"),
    ("Ishita Chopra",    "9876500043", "ishita.chopra@smartposdemo.com"),
    # Low / Walk-in tier (15)
    ("Rohit Das",        "9876500017", "rohit.das@smartposdemo.com"),
    ("Kavita Rao",       "9876500034", "kavita.rao@smartposdemo.com"),
    ("Suresh Kumar",     "9876500035", "suresh.kumar@smartposdemo.com"),
    ("Bhavna Shah",      "9876500036", "bhavna.shah@smartposdemo.com"),
    ("Nikhil Sharma",    "9876500037", "nikhil.sharma@smartposdemo.com"),
    ("Amrita Pillai",    "9876500038", "amrita.pillai@smartposdemo.com"),
    ("Tarun Saxena",     "9876500039", "tarun.saxena@smartposdemo.com"),
    ("Preeti Gupta",     "9876500040", "preeti.gupta@smartposdemo.com"),
    ("Manish Tiwari",    "9876500044", "manish.tiwari@smartposdemo.com"),
    ("Nandini Kulkarni", "9876500045", "nandini.kulkarni@smartposdemo.com"),
    ("Aisha Khan",       "9876500046", "aisha.khan@smartposdemo.com"),
    ("Deepak Jain",      "9876500047", "deepak.jain@smartposdemo.com"),
    ("Ritika Malhotra",  "9876500048", "ritika.malhotra@smartposdemo.com"),
    ("Varun Reddy",      "9876500049", "varun.reddy@smartposdemo.com"),
    ("Sakshi Pandey",    "9876500050", "sakshi.pandey@smartposdemo.com"),
]

# ──────────────────────────────────────────────────────────────
# Price change history for price-drop eligible customer logic
# ──────────────────────────────────────────────────────────────
PRICE_CHANGES: List[Tuple[str, float, float, int]] = [
    # (sku, old_price, new_price, days_ago)
    ("HCL-DTG-1K",  235.0, 220.0, 25),
    ("HCL-DTG-1K",  220.0, 210.0, 12),
    ("IMS-KTC-500",  99.0,  95.0, 20),
    ("IMS-KTC-500",  95.0,  90.0,  8),
    ("SNK-PRC-120",  72.0,  65.0, 18),
    ("BEV-CCF-200",  60.0,  55.0, 15),
    ("DBY-BRD-400",  55.0,  50.0, 22),
    ("ELC-EAR-W01", 450.0, 399.0, 10),
    ("HLT-HNY-250", 210.0, 185.0,  7),
    ("FRZ-ICE-500", 165.0, 145.0,  5),
    ("PCL-SUN-050", 220.0, 180.0,  3),
    ("BBY-DPR-030", 499.0, 450.0, 14),
    ("SPC-GRM-100",  95.0,  80.0, 17),
]


def _pick_actor() -> str:
    emails = list(ACTOR_WEIGHTS.keys())
    weights = [ACTOR_WEIGHTS[e] for e in emails]
    return RNG.choices(emails, weights=weights, k=1)[0]


# ══════════════════════════════════════════════════════════════
#  1.  WIPE OLD DATA (preserves users table)
# ══════════════════════════════════════════════════════════════
def nuke_business_data(db) -> None:
    """Delete ALL business data so we seed from scratch. Users preserved."""
    print("  Clearing invoice items …")
    db.query(InvoiceItem).delete(synchronize_session=False)
    print("  Clearing notifications …")
    db.query(Notification).delete(synchronize_session=False)
    print("  Clearing notification campaigns …")
    db.query(NotificationCampaign).delete(synchronize_session=False)
    print("  Clearing notification templates …")
    db.query(NotificationTemplate).delete(synchronize_session=False)
    print("  Clearing price history …")
    db.query(ProductPriceHistory).delete(synchronize_session=False)
    print("  Clearing scheduled price changes …")
    db.query(ScheduledPriceChange).delete(synchronize_session=False)
    print("  Clearing invoices …")
    db.query(Invoice).delete(synchronize_session=False)
    print("  Clearing audit logs …")
    db.query(AuditLog).delete(synchronize_session=False)
    print("  Clearing products …")
    db.query(Product).delete(synchronize_session=False)
    print("  Clearing categories …")
    db.query(Category).delete(synchronize_session=False)
    print("  Clearing customers …")
    db.query(Customer).delete(synchronize_session=False)
    db.commit()
    print("  ✓ All business data cleared.\n")


# ══════════════════════════════════════════════════════════════
#  2.  ENSURE STAFF USERS
# ══════════════════════════════════════════════════════════════
def ensure_staff_users(db) -> Dict[str, User]:
    for entry in STAFF_USERS:
        existing = db.query(User).filter(User.email == entry["email"]).first()
        if existing:
            existing.username = entry["username"]
            existing.role = entry["role"]
            existing.is_active = True
            existing.session_revoked = False
            existing.hashed_password = hash_password(entry["password"])
        else:
            db.add(User(
                email=entry["email"],
                username=entry["username"],
                role=entry["role"],
                hashed_password=hash_password(entry["password"]),
                is_active=True,
                session_revoked=False,
            ))
    db.flush()
    users = db.query(User).filter(User.email.in_(STAFF_EMAILS)).all()
    return {u.email: u for u in users}


# ══════════════════════════════════════════════════════════════
#  3.  SEED CATEGORIES & PRODUCTS
# ══════════════════════════════════════════════════════════════
def seed_categories_and_products(db) -> Tuple[Dict[str, Category], Dict[str, Product]]:
    category_map: Dict[str, Category] = {}
    for name in CATEGORIES:
        c = Category(name=name)
        db.add(c)
        db.flush()
        category_map[name] = c

    product_map: Dict[str, Product] = {}
    for pname, sku, cat_name, price, tax_rate, stock in PRODUCTS:
        p = Product(
            name=pname, sku=sku, price=price, stock=stock,
            tax_rate=tax_rate, category_id=category_map[cat_name].id,
            is_active=True,
        )
        db.add(p)
        db.flush()
        product_map[sku] = p

    print(f"  ✓ {len(category_map)} categories, {len(product_map)} products seeded.")
    return category_map, product_map


# ══════════════════════════════════════════════════════════════
#  4.  SEED CUSTOMERS
# ══════════════════════════════════════════════════════════════
def seed_customers(db, now_utc: datetime) -> Dict[str, Customer]:
    customer_map: Dict[str, Customer] = {}
    for cname, phone, email in CUSTOMERS_DATA:
        created = now_utc - timedelta(days=RNG.randint(2, 60))
        c = Customer(name=cname, phone=phone, email=email, created_at=created)
        db.add(c)
        db.flush()
        customer_map[cname] = c
    print(f"  ✓ {len(customer_map)} customers seeded.")
    return customer_map


# ══════════════════════════════════════════════════════════════
#  5.  SEED PRICE HISTORY
# ══════════════════════════════════════════════════════════════
def seed_price_history(db, product_map: Dict[str, Product], now_utc: datetime) -> None:
    count = 0
    for sku, old_p, new_p, days_ago in PRICE_CHANGES:
        if sku not in product_map:
            continue
        changed_at = now_utc - timedelta(days=days_ago, hours=RNG.randint(8, 18))
        db.add(ProductPriceHistory(
            product_id=product_map[sku].id,
            old_price=old_p,
            new_price=new_p,
            changed_at=changed_at,
        ))
        count += 1
    db.flush()
    print(f"  ✓ {count} price history entries seeded.")


# ══════════════════════════════════════════════════════════════
#  6.  SEED INVOICES & INVOICE ITEMS (30 days, realistic patterns)
# ══════════════════════════════════════════════════════════════
def seed_invoices(db, product_map: Dict[str, Product], customer_map: Dict[str, Customer], now_utc: datetime) -> int:
    all_customers = list(customer_map.values())
    all_skus = list(product_map.keys())
    # Customers weighted by tier
    vip_names = [n for n, _, _ in CUSTOMERS_DATA[:3]]
    high_names = [n for n, _, _ in CUSTOMERS_DATA[3:10]]
    regular_names = [n for n, _, _ in CUSTOMERS_DATA[10:20]]
    low_names = [n for n, _, _ in CUSTOMERS_DATA[20:]]

    total_invoices = 0
    payment_methods = ["cash", "cash", "cash", "upi", "upi", "upi", "card", "card", "credit"]

    for day_back in range(30, -1, -1):
        day = now_utc - timedelta(days=day_back)
        weekday = day.weekday()

        # Invoice count per day with realistic pattern
        base = 8
        if weekday in (5, 6):  # Sat/Sun busier
            base += 6
        elif weekday == 4:  # Friday moderate bump
            base += 3
        if day_back <= 7:
            base += 3  # recent week busier (growth trend)
        if day_back <= 2:
            base += 2  # today and yesterday peak

        invoice_count = base + RNG.randint(0, 5)

        for _ in range(invoice_count):
            # Realistic business hours 9 AM - 10 PM with bell curve peaks
            hour = RNG.choices(
                [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
                weights=[2, 4, 6, 8, 9, 7, 6, 5, 7, 9, 8, 5, 2],
                k=1
            )[0]
            minute = RNG.randint(0, 59)
            second = RNG.randint(0, 59)
            created = day.replace(hour=hour, minute=minute, second=second, microsecond=0)

            # Pick customer (VIP buy more often)
            tier_roll = RNG.random()
            if tier_roll < 0.15:
                cust = customer_map[RNG.choice(vip_names)]
            elif tier_roll < 0.40:
                cust = customer_map[RNG.choice(high_names)]
            elif tier_roll < 0.70:
                cust = customer_map[RNG.choice(regular_names)]
            else:
                cust = customer_map[RNG.choice(low_names)]

            # Build basket: 1-6 items
            num_items = RNG.choices([1, 2, 3, 4, 5, 6], weights=[10, 25, 30, 20, 10, 5], k=1)[0]
            basket_skus = RNG.sample(all_skus, min(num_items, len(all_skus)))

            subtotal = 0.0
            tax_total = 0.0
            invoice_items: List[InvoiceItem] = []

            for sku in basket_skus:
                product = product_map[sku]
                qty = RNG.choices([1, 2, 3, 4, 5], weights=[40, 30, 15, 10, 5], k=1)[0]
                if product.stock < qty:
                    qty = max(1, product.stock)
                if product.stock <= 0:
                    continue

                line_total = round(product.price * qty, 2)
                line_tax = round(line_total * (product.tax_rate / 100.0), 2)
                subtotal += line_total
                tax_total += line_tax
                product.stock -= qty

                invoice_items.append(InvoiceItem(
                    product_id=product.id,
                    quantity=qty,
                    price_at_purchase=product.price,
                    tax_rate=product.tax_rate,
                    line_total=line_total,
                    line_tax=line_tax,
                ))

            if not invoice_items:
                continue

            grand_total = round(subtotal + tax_total, 2)
            payment_method = RNG.choice(payment_methods)

            amount_tendered = None
            change_due = None
            if payment_method == "cash":
                amount_tendered = float(math.ceil(grand_total / 50) * 50)
                change_due = round(amount_tendered - grand_total, 2)

            invoice = Invoice(
                customer_id=cust.id,
                subtotal=round(subtotal, 2),
                tax_amount=round(tax_total, 2),
                total_amount=grand_total,
                payment_method=payment_method,
                payment_status="paid",
                amount_tendered=amount_tendered,
                change_due=change_due,
                created_at=created,
            )
            db.add(invoice)
            db.flush()

            for it in invoice_items:
                it.invoice_id = invoice.id
                db.add(it)

            total_invoices += 1

            # Create audit log for this invoice
            actor_email = _pick_actor()
            db.add(AuditLog(
                actor_email=actor_email,
                action="invoice_created",
                entity_type="invoice",
                entity_id=str(invoice.id),
                details=json.dumps({
                    "customer_id": cust.id,
                    "items_count": len(invoice_items),
                    "payment_method": payment_method,
                    "total_amount": grand_total,
                    "seed_tag": SEED_TAG,
                }),
                created_at=created,
            ))

    db.flush()
    print(f"  ✓ {total_invoices} invoices with line items seeded across 30 days.")
    return total_invoices


# ══════════════════════════════════════════════════════════════
#  7.  SEED AUDIT LOGS (user activity, logins, admin actions, refunds)
# ══════════════════════════════════════════════════════════════
def seed_user_activity(db, users_by_email: Dict[str, User], now_utc: datetime) -> None:
    admin_email = None
    admin_user = db.query(User).filter(User.role == "admin").first()
    if admin_user:
        admin_email = admin_user.email
    else:
        admin_email = "rahulsharma@acpce.ac.in"

    # ── Staff login activity across 30 days ──
    for day_back in range(30, -1, -1):
        day = now_utc - timedelta(days=day_back)
        active_staff = RNG.sample(STAFF_EMAILS, k=RNG.randint(3, 5))
        for email in active_staff:
            login_time = day.replace(
                hour=RNG.randint(8, 10), minute=RNG.randint(0, 59), second=RNG.randint(0, 59)
            )
            db.add(AuditLog(
                actor_email=email,
                action="login_success",
                entity_type="auth",
                entity_id=None,
                details=json.dumps({"seed_tag": SEED_TAG}),
                created_at=login_time,
            ))
            # Some staff log out
            if RNG.random() < 0.6:
                logout_time = login_time + timedelta(hours=RNG.randint(4, 10))
                db.add(AuditLog(
                    actor_email=email,
                    action="logout",
                    entity_type="auth",
                    entity_id=None,
                    details=json.dumps({"seed_tag": SEED_TAG}),
                    created_at=logout_time,
                ))

    # ── Failed login attempts (security signals) ──
    for i in range(25):
        days_back = RNG.randint(0, 15)
        created = now_utc - timedelta(days=days_back, hours=RNG.randint(0, 23), minutes=RNG.randint(0, 59))
        db.add(AuditLog(
            actor_email=f"intruder{RNG.randint(1, 8)}@unknown.demo",
            action="login_failed",
            entity_type="auth",
            entity_id=None,
            details=json.dumps({
                "reason": RNG.choice(["invalid_password", "email_not_found", "account_locked"]),
                "seed_tag": SEED_TAG,
            }),
            created_at=created,
        ))

    # ── Admin actions across the month ──
    admin_actions = [
        ("user_role_changed", "user", {"target_email": "rohit.patel.cashier@smartpos.demo", "old_role": "cashier", "new_role": "cashier"}),
        ("user_status_changed", "user", {"target_email": "aman.khan.cashier@smartpos.demo", "old_is_active": False, "new_is_active": True}),
        ("user_session_revoked", "user", {"target_email": "priya.shah.cashier@smartpos.demo"}),
        ("user_username_changed", "user", {"target_email": "neha.verma.manager@smartpos.demo", "old_username": "N. Verma", "new_username": "Neha Verma"}),
        ("price_updated", "product", {"product_sku": "HCL-DTG-1K", "old_price": 220.0, "new_price": 210.0}),
        ("price_updated", "product", {"product_sku": "ELC-EAR-W01", "old_price": 450.0, "new_price": 399.0}),
        ("product_created", "product", {"product_name": "Coconut Water 330ml", "sku": "BEV-COC-330"}),
        ("product_created", "product", {"product_name": "Sunscreen 50ml", "sku": "PCL-SUN-050"}),
        ("product_restocked", "product", {"product_sku": "BEV-WTR-1L", "added_stock": 100}),
        ("product_restocked", "product", {"product_sku": "SNK-CHP-052", "added_stock": 150}),
        ("category_created", "category", {"category_name": "Baby & Kids"}),
        ("category_created", "category", {"category_name": "Spices & Condiments"}),
        ("customer_created", "customer", {"customer_name": "Manish Tiwari"}),
        ("customer_created", "customer", {"customer_name": "Nandini Kulkarni"}),
        ("customer_updated", "customer", {"customer_name": "Vikram Mehta", "field": "email"}),
    ]

    for idx, (action, entity_type, extra) in enumerate(admin_actions):
        details = {**extra, "seed_tag": SEED_TAG}
        created = now_utc - timedelta(days=RNG.randint(1, 28), hours=RNG.randint(9, 18))
        db.add(AuditLog(
            actor_email=admin_email,
            action=action,
            entity_type=entity_type,
            entity_id=str(500 + idx),
            details=json.dumps(details),
            created_at=created,
        ))

    # ── Manager actions ──
    manager_actions = [
        ("price_updated", "product", {"product_sku": "IMS-KTC-500", "old_price": 95.0, "new_price": 90.0}),
        ("product_restocked", "product", {"product_sku": "DBY-MLK-500", "added_stock": 50}),
        ("product_restocked", "product", {"product_sku": "PCL-TPT-150", "added_stock": 80}),
        ("bulk_price_update", "product", {"count": 5, "type": "percentage", "change": -5.0}),
        ("notification_campaign_sent", "notification", {"campaign_name": "Price Drop Alert", "customer_count": 12}),
    ]
    for idx, (action, entity_type, extra) in enumerate(manager_actions):
        details = {**extra, "seed_tag": SEED_TAG}
        created = now_utc - timedelta(days=RNG.randint(1, 20), hours=RNG.randint(10, 17))
        db.add(AuditLog(
            actor_email=RNG.choice(["arjun.mehta.manager@smartpos.demo", "neha.verma.manager@smartpos.demo"]),
            action=action,
            entity_type=entity_type,
            entity_id=str(600 + idx),
            details=json.dumps(details),
            created_at=created,
        ))

    # ── Refund events (for refund rate KPI) ──
    for ridx in range(8):
        created = now_utc - timedelta(days=RNG.randint(0, 14), hours=RNG.randint(10, 20))
        db.add(AuditLog(
            actor_email=RNG.choice(STAFF_EMAILS),
            action="invoice_refunded",
            entity_type="invoice",
            entity_id=str(9900 + ridx),
            details=json.dumps({"reason": RNG.choice(["customer_return", "defective_product", "wrong_item"]), "seed_tag": SEED_TAG}),
            created_at=created,
        ))

    # ── Update last_login_at for staff ──
    for email, user_obj in users_by_email.items():
        user_obj.last_login_at = now_utc - timedelta(hours=RNG.randint(0, 6))
        user_obj.is_active = True

    db.flush()
    print("  ✓ User activity, login events, admin actions, and refunds seeded.")


# ══════════════════════════════════════════════════════════════
#  8.  SEED NOTIFICATION TEMPLATES & CAMPAIGNS
# ══════════════════════════════════════════════════════════════
def seed_notifications(db, product_map: Dict[str, Product], customer_map: Dict[str, Customer], now_utc: datetime) -> None:
    # Templates
    templates = [
        NotificationTemplate(
            name="Price Drop Alert",
            channel="EMAIL",
            subject_template="Price drop on {{product_name}}!",
            body_template="Hi {{customer_name}}, great news! {{product_name}} is now available at ₹{{new_price}} (was ₹{{old_price}}). Visit your nearest SmartPOS store!",
            is_active=True,
            created_at=now_utc - timedelta(days=28),
        ),
        NotificationTemplate(
            name="Welcome Email",
            channel="EMAIL",
            subject_template="Welcome to SmartPOS, {{customer_name}}!",
            body_template="Dear {{customer_name}}, thank you for choosing SmartPOS. Enjoy exclusive deals and fast billing!",
            is_active=True,
            created_at=now_utc - timedelta(days=25),
        ),
        NotificationTemplate(
            name="Restock SMS Alert",
            channel="SMS",
            subject_template=None,
            body_template="SmartPOS: {{product_name}} is back in stock! Grab yours before it sells out.",
            is_active=True,
            created_at=now_utc - timedelta(days=20),
        ),
    ]
    db.add_all(templates)
    db.flush()

    # Campaigns
    price_drop_product = product_map.get("ELC-EAR-W01")
    campaign1 = NotificationCampaign(
        name="Earphones Price Drop Campaign",
        channel="EMAIL",
        template_id=templates[0].id,
        product_id=price_drop_product.id if price_drop_product else None,
        status="SENT",
        total_count=8,
        sent_count=7,
        failed_count=1,
        created_at=now_utc - timedelta(days=9),
        sent_at=now_utc - timedelta(days=9, hours=-2),
    )
    db.add(campaign1)

    honey_product = product_map.get("HLT-HNY-250")
    campaign2 = NotificationCampaign(
        name="Honey Price Drop Campaign",
        channel="EMAIL",
        template_id=templates[0].id,
        product_id=honey_product.id if honey_product else None,
        status="SENT",
        total_count=5,
        sent_count=5,
        failed_count=0,
        created_at=now_utc - timedelta(days=6),
        sent_at=now_utc - timedelta(days=6, hours=-1),
    )
    db.add(campaign2)

    campaign3 = NotificationCampaign(
        name="Welcome New Customers",
        channel="EMAIL",
        template_id=templates[1].id,
        product_id=None,
        status="SENT",
        total_count=10,
        sent_count=10,
        failed_count=0,
        created_at=now_utc - timedelta(days=15),
        sent_at=now_utc - timedelta(days=15, hours=-1),
    )
    db.add(campaign3)
    db.flush()

    # Individual notifications linked to campaigns
    cust_list = list(customer_map.values())
    if price_drop_product:
        for i in range(8):
            cust = cust_list[i % len(cust_list)]
            status = "SENT" if i < 7 else "FAILED"
            db.add(Notification(
                customer_id=cust.id,
                product_id=price_drop_product.id,
                campaign_id=campaign1.id,
                template_id=templates[0].id,
                old_price=450.0,
                new_price=399.0,
                channel="EMAIL",
                email=cust.email,
                subject=f"Price drop on Wired Earphones!",
                message=f"Hi {cust.name}, Wired Earphones is now ₹399 (was ₹450)!",
                status=status,
                error_message="SMTP timeout" if status == "FAILED" else None,
                created_at=now_utc - timedelta(days=9),
                sent_at=(now_utc - timedelta(days=9, hours=-2)) if status == "SENT" else None,
            ))

    if honey_product:
        for i in range(5):
            cust = cust_list[(i + 10) % len(cust_list)]
            db.add(Notification(
                customer_id=cust.id,
                product_id=honey_product.id,
                campaign_id=campaign2.id,
                template_id=templates[0].id,
                old_price=210.0,
                new_price=185.0,
                channel="EMAIL",
                email=cust.email,
                subject=f"Price drop on Raw Honey!",
                message=f"Hi {cust.name}, Raw Honey 250g is now ₹185 (was ₹210)!",
                status="SENT",
                created_at=now_utc - timedelta(days=6),
                sent_at=now_utc - timedelta(days=6, hours=-1),
            ))

    db.flush()
    print(f"  ✓ {len(templates)} templates, 3 campaigns, 13+ notifications seeded.")


# ══════════════════════════════════════════════════════════════
#  9.  CREATE INTENTIONAL INVENTORY SHORTAGES
# ══════════════════════════════════════════════════════════════
def create_inventory_shortages(db, product_map: Dict[str, Product]) -> None:
    """Artificially set some products to out-of-stock or low-stock for dashboard risk widget."""
    shortage_map = {
        "DBY-PNR-200": 0,    # out of stock
        "FRZ-PRT-400": 0,    # out of stock
        "BBY-DPR-030": 2,    # critical low
        "HLT-MVT-030": 3,    # critical low
        "SPC-CHL-200": 5,    # low stock
        "PCL-SUN-050": 4,    # low stock
        "SNK-TRL-200": 7,    # low stock
        "BEV-COC-330": 8,    # low stock
        "IMS-POH-070": 6,    # low stock
    }
    for sku, stock_level in shortage_map.items():
        if sku in product_map:
            product_map[sku].stock = stock_level
    db.flush()
    oos = sum(1 for s in shortage_map.values() if s == 0)
    low = sum(1 for s in shortage_map.values() if 0 < s <= 10)
    print(f"  ✓ Inventory shortages set: {oos} out-of-stock, {low} low-stock.")


# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════
def main():
    db = SessionLocal()
    try:
        now_utc = datetime.now(timezone.utc)
        print("=" * 60)
        print("  SmartPOS CRM AI – Full 30-Day Demo Seeder")
        print("=" * 60)

        print("\n[1/8] Ensuring staff users …")
        users_by_email = ensure_staff_users(db)

        print("[2/8] Clearing old business data …")
        nuke_business_data(db)

        print("[3/8] Seeding categories & products …")
        category_map, product_map = seed_categories_and_products(db)

        print("[4/8] Seeding customers …")
        customer_map = seed_customers(db, now_utc)

        print("[5/8] Seeding price history …")
        seed_price_history(db, product_map, now_utc)

        print("[6/8] Seeding invoices & line items (30 days) …")
        total_inv = seed_invoices(db, product_map, customer_map, now_utc)

        print("[7/8] Seeding user activity & audit logs …")
        seed_user_activity(db, users_by_email, now_utc)

        print("[8/8] Seeding notifications & creating inventory shortages …")
        seed_notifications(db, product_map, customer_map, now_utc)
        create_inventory_shortages(db, product_map)

        db.commit()

        # ── Summary ──
        today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        inv_today = db.query(Invoice).filter(Invoice.created_at >= today_start).count()
        inv_total = db.query(Invoice).count()
        cust_total = db.query(Customer).count()
        prod_total = db.query(Product).filter(Product.is_active == True).count()
        oos = db.query(Product).filter(Product.stock <= 0, Product.is_active == True).count()
        low = db.query(Product).filter(Product.stock > 0, Product.stock <= 10, Product.is_active == True).count()
        logs_total = db.query(AuditLog).count()

        # Payment method breakdown
        cash_count = db.query(Invoice).filter(Invoice.payment_method == "cash").count()
        upi_count = db.query(Invoice).filter(Invoice.payment_method == "upi").count()
        card_count = db.query(Invoice).filter(Invoice.payment_method == "card").count()
        credit_count = db.query(Invoice).filter(Invoice.payment_method == "credit").count()

        print("\n" + "=" * 60)
        print("  SEED COMPLETE – Summary")
        print("=" * 60)
        print(f"  Categories:      {len(CATEGORIES)}")
        print(f"  Products:        {prod_total}")
        print(f"  Customers:       {cust_total}")
        print(f"  Total Invoices:  {inv_total}")
        print(f"  Invoices Today:  {inv_today}")
        print(f"  Audit Logs:      {logs_total}")
        print(f"  Out of Stock:    {oos}")
        print(f"  Low Stock:       {low}")
        print(f"  Payment Split:   Cash={cash_count} | UPI={upi_count} | Card={card_count} | Credit={credit_count}")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"\n  ✗ ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
