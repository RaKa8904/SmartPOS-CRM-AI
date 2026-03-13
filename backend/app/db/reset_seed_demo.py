from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

from app.db.database import SessionLocal
from app.models.category import Category
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.notification import Notification
from app.models.price_history import ProductPriceHistory
from app.models.product import Product


def reset_business_data() -> None:
    """Delete business data while keeping users for login access."""
    db = SessionLocal()
    try:
        db.query(InvoiceItem).delete(synchronize_session=False)
        db.query(Notification).delete(synchronize_session=False)
        db.query(ProductPriceHistory).delete(synchronize_session=False)
        db.query(Invoice).delete(synchronize_session=False)
        db.query(Product).delete(synchronize_session=False)
        db.query(Category).delete(synchronize_session=False)
        db.query(Customer).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def seed_demo_data() -> None:
    db = SessionLocal()  # noqa: F841
    try:
        # ---------------- CATEGORIES ----------------
        category_names = [
            "Beverages", "Snacks", "Dairy & Bakery",
            "Instant Meals", "Personal Care", "Home & Cleaning",
            "Stationery", "Frozen Foods", "Health & Wellness",
            "Electronics Accessories",
        ]
        category_map: Dict[str, Category] = {}
        for name in category_names:
            c = Category(name=name)
            db.add(c)
            db.flush()
            category_map[name] = c

        # ---------------- PRODUCTS ----------------
        products_data: List[Tuple[str, str, str, float, float, int]] = [
            # Beverages (4)
            ("Mineral Water 1L",       "BEV-WTR-1L",  "Beverages",              20.0,  5.0, 300),
            ("Cold Coffee Can",        "BEV-CCF-200",  "Beverages",              55.0, 12.0, 200),
            ("Mango Juice 1L",         "BEV-MNG-1L",   "Beverages",             110.0, 12.0, 150),
            ("Energy Drink 250ml",     "BEV-ENG-250",  "Beverages",              85.0, 12.0, 160),
            # Snacks (4)
            ("Salted Chips 52g",       "SNK-CHP-052",  "Snacks",                 20.0, 12.0, 300),
            ("Chocolate Bar",          "SNK-CHO-045",  "Snacks",                 30.0, 12.0, 250),
            ("Protein Cookies",        "SNK-PRC-120",  "Snacks",                 65.0, 12.0, 180),
            ("Roasted Peanuts 150g",   "SNK-PNT-150",  "Snacks",                 35.0, 12.0, 200),
            # Dairy & Bakery (4)
            ("Whole Wheat Bread",      "DBY-BRD-400",  "Dairy & Bakery",         50.0,  5.0, 180),
            ("Toned Milk 500ml",       "DBY-MLK-500",  "Dairy & Bakery",         30.0,  5.0, 250),
            ("Cheese Slices 200g",     "DBY-CHS-200",  "Dairy & Bakery",        125.0, 12.0, 120),
            ("Butter 100g",            "DBY-BTR-100",  "Dairy & Bakery",         55.0, 12.0, 130),
            # Instant Meals (3)
            ("Masala Noodles",         "IMS-NDL-070",  "Instant Meals",          18.0,  5.0, 350),
            ("Ready Upma Cup",         "IMS-UPM-070",  "Instant Meals",          45.0, 12.0, 180),
            ("Tomato Ketchup 500g",    "IMS-KTC-500",  "Instant Meals",          90.0, 12.0, 130),
            # Personal Care (4)
            ("Toothpaste 150g",        "PCL-TPT-150",  "Personal Care",          75.0, 18.0, 200),
            ("Shampoo Sachet",         "PCL-SHM-008",  "Personal Care",           3.0, 18.0, 1000),
            ("Hand Wash 250ml",        "PCL-HWS-250",  "Personal Care",          95.0, 18.0, 180),
            ("Face Wash 100ml",        "PCL-FCW-100",  "Personal Care",         120.0, 18.0, 150),
            # Home & Cleaning (3)
            ("Dishwash Liquid 500ml",  "HCL-DSW-500",  "Home & Cleaning",       110.0, 18.0, 150),
            ("Floor Cleaner 1L",       "HCL-FCL-1L",   "Home & Cleaning",       165.0, 18.0, 120),
            ("Laundry Detergent 1kg",  "HCL-DTG-1K",   "Home & Cleaning",       210.0, 18.0, 150),
            # Stationery (3)
            ("Notebook A5",            "STN-NBK-A5",   "Stationery",             45.0, 12.0, 160),
            ("Blue Pen Pack (5)",      "STN-PEN-5P",   "Stationery",             50.0, 12.0, 180),
            ("Sticky Notes 100pk",     "STN-STK-100",  "Stationery",             40.0, 12.0, 200),
            # Frozen Foods (3) — NEW
            ("Frozen Peas 500g",       "FRZ-PEA-500",  "Frozen Foods",           65.0,  5.0, 150),
            ("Ice Cream Vanilla 500ml","FRZ-ICE-500",  "Frozen Foods",          145.0, 12.0, 100),
            ("Frozen Corn 400g",       "FRZ-CRN-400",  "Frozen Foods",           75.0,  5.0, 130),
            # Health & Wellness (4) — NEW
            ("Rolled Oats 500g",       "HLT-OAT-500",  "Health & Wellness",     120.0,  5.0, 160),
            ("Raw Honey 250g",         "HLT-HNY-250",  "Health & Wellness",     185.0,  5.0, 110),
            ("Green Tea 25 Bags",      "HLT-GTH-025",  "Health & Wellness",      95.0, 12.0, 140),
            ("Protein Bar 60g",        "HLT-PBR-060",  "Health & Wellness",      55.0, 18.0, 200),
            # Electronics Accessories (4) — NEW
            ("USB-C Cable 1m",         "ELC-USB-1M",   "Electronics Accessories",250.0, 18.0, 180),
            ("Wired Earphones",        "ELC-EAR-W01",  "Electronics Accessories",399.0, 18.0, 120),
            ("Phone Stand",            "ELC-STD-001",  "Electronics Accessories",199.0, 18.0, 120),
            ("Screen Wipes 20-pack",   "ELC-WIP-020",  "Electronics Accessories", 45.0, 18.0, 160),
        ]

        product_map: Dict[str, Product] = {}
        for pname, sku, cat_name, price, tax_rate, stock in products_data:
            p = Product(
                name=pname, sku=sku, price=price, stock=stock, tax_rate=tax_rate,
                category_id=category_map[cat_name].id,
                is_active=True,
            )
            db.add(p)
            db.flush()
            product_map[sku] = p

        # ---------------- CUSTOMERS ----------------
        # 25 customers distributed across 4 spending tiers
        customers_data = [
            # VIP tier
            ("Vikram Mehta",    "9876500013", "vikram.mehta@smartposdemo.com"),
            ("Dev Kapoor",      "9876500026", "dev.kapoor@smartposdemo.com"),
            ("Sunita Bose",     "9876500027", "sunita.bose@smartposdemo.com"),
            # High Value tier
            ("Rahul Sharma",    "9876500011", "rahul.sharma@smartposdemo.com"),
            ("Ananya Verma",    "9876500012", "ananya.verma@smartposdemo.com"),
            ("Priya Nair",      "9876500014", "priya.nair@smartposdemo.com"),
            ("Karan Malhotra",  "9876500019", "karan.malhotra@smartposdemo.com"),
            ("Aarav Gupta",     "9876500028", "aarav.gupta@smartposdemo.com"),
            ("Ravi Krishnan",   "9876500029", "ravi.krishnan@smartposdemo.com"),
            ("Meera Joshi",     "9876500030", "meera.joshi@smartposdemo.com"),
            # Regular tier
            ("Arjun Patel",     "9876500015", "arjun.patel@smartposdemo.com"),
            ("Neha Singh",      "9876500016", "neha.singh@smartposdemo.com"),
            ("Pooja Menon",     "9876500020", "pooja.menon@smartposdemo.com"),
            ("Farhan Ali",      "9876500031", "farhan.ali@smartposdemo.com"),
            ("Divya Chaudhary", "9876500032", "divya.chaudhary@smartposdemo.com"),
            ("Sneha Iyer",      "9876500018", "sneha.iyer@smartposdemo.com"),
            ("Yash Mehta",      "9876500033", "yash.mehta@smartposdemo.com"),
            # Low Value tier
            ("Rohit Das",       "9876500017", "rohit.das@smartposdemo.com"),
            ("Kavita Rao",      "9876500034", "kavita.rao@smartposdemo.com"),
            ("Suresh Kumar",    "9876500035", "suresh.kumar@smartposdemo.com"),
            ("Bhavna Shah",     "9876500036", "bhavna.shah@smartposdemo.com"),
            ("Nikhil Sharma",   "9876500037", "nikhil.sharma@smartposdemo.com"),
            ("Amrita Pillai",   "9876500038", "amrita.pillai@smartposdemo.com"),
            ("Tarun Saxena",    "9876500039", "tarun.saxena@smartposdemo.com"),
            ("Preeti Gupta",    "9876500040", "preeti.gupta@smartposdemo.com"),
        ]

        customer_map: Dict[str, Customer] = {}
        for cname, phone, email in customers_data:
            c = Customer(name=cname, phone=phone, email=email)
            db.add(c)
            db.flush()
            customer_map[cname] = c

        # ---------------- PRICE HISTORY ----------------
        price_moves = [
            ("HCL-DTG-1K",  235.0, 220.0),
            ("HCL-DTG-1K",  220.0, 210.0),
            ("IMS-KTC-500",  99.0,  95.0),
            ("IMS-KTC-500",  95.0,  90.0),
            ("SNK-PRC-120",  72.0,  65.0),
            ("BEV-CCF-200",  60.0,  55.0),
            ("DBY-BRD-400",  55.0,  50.0),
            ("ELC-EAR-W01", 450.0, 399.0),
            ("HLT-HNY-250", 210.0, 185.0),
            ("FRZ-ICE-500", 165.0, 145.0),
        ]

        for sku, old_p, new_p in price_moves:
            db.add(ProductPriceHistory(
                product_id=product_map[sku].id,
                old_price=old_p, new_price=new_p,
            ))

        # ---------------- INVOICES + ITEMS ----------------
        # Format: (customer_name, payment_method, [(sku, qty), ...])
        # Cash amount_tendered is auto-computed to nearest ₹50 ceiling above grand total.
        #
        # Spending tiers designed for K-means to find 4 clear clusters:
        #   VIP          ~5-6 invoices, large premium baskets  (₹5000+ total)
        #   High Value   ~3-4 invoices, moderate-high baskets  (₹1200–2500)
        #   Regular      ~2   invoices, small-moderate baskets (₹400–900)
        #   Low Value    ~1   invoice,  small basket           (₹60–300)
        baskets = [
            # ── VIP: Vikram Mehta (6 invoices) ───────────────────────────
            ("Vikram Mehta",    "card", [("ELC-EAR-W01", 1), ("ELC-USB-1M",  2), ("HCL-DTG-1K",  1)]),
            ("Vikram Mehta",    "upi",  [("ELC-STD-001", 1), ("ELC-USB-1M",  1), ("PCL-HWS-250", 2), ("DBY-CHS-200", 1)]),
            ("Vikram Mehta",    "card", [("HCL-FCL-1L",  1), ("HCL-DSW-500", 2), ("HLT-HNY-250", 1)]),
            ("Vikram Mehta",    "upi",  [("ELC-EAR-W01", 1), ("FRZ-ICE-500", 2), ("HLT-OAT-500", 1)]),
            ("Vikram Mehta",    "card", [("HCL-DTG-1K",  2), ("ELC-STD-001", 1), ("BEV-MNG-1L",  2)]),
            ("Vikram Mehta",    "upi",  [("ELC-USB-1M",  3), ("PCL-TPT-150", 2), ("HLT-GTH-025", 1)]),
            # ── VIP: Dev Kapoor (6 invoices) ─────────────────────────────
            ("Dev Kapoor",      "card", [("ELC-EAR-W01", 2), ("ELC-STD-001", 1), ("DBY-CHS-200", 2)]),
            ("Dev Kapoor",      "upi",  [("HCL-DTG-1K",  1), ("HLT-HNY-250", 2), ("PCL-HWS-250", 1)]),
            ("Dev Kapoor",      "card", [("ELC-USB-1M",  2), ("HCL-FCL-1L",  2), ("FRZ-ICE-500", 1)]),
            ("Dev Kapoor",      "upi",  [("ELC-EAR-W01", 1), ("HLT-OAT-500", 2), ("BEV-MNG-1L",  2)]),
            ("Dev Kapoor",      "card", [("HCL-DTG-1K",  2), ("HLT-PBR-060", 3), ("PCL-FCW-100", 2)]),
            ("Dev Kapoor",      "upi",  [("ELC-STD-001", 2), ("FRZ-CRN-400", 2), ("IMS-KTC-500", 2)]),
            # ── VIP: Sunita Bose (5 invoices) ────────────────────────────
            ("Sunita Bose",     "card", [("ELC-EAR-W01", 1), ("HCL-DTG-1K",  1), ("HLT-HNY-250", 1), ("FRZ-ICE-500", 1)]),
            ("Sunita Bose",     "upi",  [("ELC-USB-1M",  2), ("HCL-FCL-1L",  1), ("DBY-CHS-200", 2)]),
            ("Sunita Bose",     "card", [("ELC-STD-001", 1), ("HLT-OAT-500", 2), ("PCL-HWS-250", 2)]),
            ("Sunita Bose",     "upi",  [("ELC-EAR-W01", 1), ("HCL-DSW-500", 2), ("HLT-GTH-025", 2)]),
            ("Sunita Bose",     "card", [("HCL-DTG-1K",  1), ("ELC-USB-1M",  1), ("BEV-MNG-1L",  3), ("SNK-PRC-120", 2)]),
            # ── High Value: Rahul Sharma (4 invoices) ────────────────────
            ("Rahul Sharma",    "cash", [("DBY-BRD-400", 3), ("IMS-KTC-500", 1), ("SNK-CHP-052", 4), ("BEV-WTR-1L",  4)]),
            ("Rahul Sharma",    "upi",  [("PCL-TPT-150", 1), ("PCL-HWS-250", 1), ("HLT-GTH-025", 1), ("SNK-PRC-120", 1)]),
            ("Rahul Sharma",    "card", [("BEV-CCF-200", 2), ("FRZ-ICE-500", 1), ("HLT-PBR-060", 2)]),
            ("Rahul Sharma",    "upi",  [("HCL-DSW-500", 1), ("DBY-CHS-200", 1), ("STN-NBK-A5",  2)]),
            # ── High Value: Ananya Verma (4 invoices) ────────────────────
            ("Ananya Verma",    "upi",  [("BEV-CCF-200", 2), ("SNK-PRC-120", 1), ("HLT-GTH-025", 1)]),
            ("Ananya Verma",    "card", [("FRZ-ICE-500", 1), ("HLT-OAT-500", 1), ("PCL-HWS-250", 1), ("DBY-CHS-200", 1)]),
            ("Ananya Verma",    "cash", [("IMS-KTC-500", 1), ("BEV-MNG-1L",  1), ("SNK-CHO-045", 4)]),
            ("Ananya Verma",    "upi",  [("HLT-HNY-250", 1), ("PCL-FCW-100", 1), ("STN-NBK-A5",  2)]),
            # ── High Value: Priya Nair (4 invoices) ──────────────────────
            ("Priya Nair",      "cash", [("IMS-NDL-070", 6), ("BEV-WTR-1L",  4), ("SNK-CHO-045", 3)]),
            ("Priya Nair",      "card", [("DBY-MLK-500", 5), ("DBY-BRD-400", 2), ("HLT-PBR-060", 2)]),
            ("Priya Nair",      "upi",  [("PCL-TPT-150", 1), ("HLT-GTH-025", 2), ("FRZ-PEA-500", 1)]),
            ("Priya Nair",      "card", [("BEV-MNG-1L",  1), ("SNK-PRC-120", 2), ("DBY-CHS-200", 1)]),
            # ── High Value: Karan Malhotra (3 invoices) ──────────────────
            ("Karan Malhotra",  "cash", [("HCL-DTG-1K",  1), ("HCL-FCL-1L",  1), ("BEV-WTR-1L",  6)]),
            ("Karan Malhotra",  "upi",  [("ELC-USB-1M",  1), ("DBY-CHS-200", 1), ("HLT-HNY-250", 1)]),
            ("Karan Malhotra",  "card", [("FRZ-ICE-500", 2), ("PCL-HWS-250", 1), ("HLT-OAT-500", 1)]),
            # ── High Value: Aarav Gupta (3 invoices) ─────────────────────
            ("Aarav Gupta",     "upi",  [("ELC-STD-001", 1), ("BEV-CCF-200", 3), ("SNK-PRC-120", 2)]),
            ("Aarav Gupta",     "card", [("HCL-DSW-500", 1), ("DBY-CHS-200", 1), ("FRZ-ICE-500", 1)]),
            ("Aarav Gupta",     "upi",  [("HLT-HNY-250", 1), ("IMS-KTC-500", 1), ("PCL-HWS-250", 1)]),
            # ── High Value: Ravi Krishnan (3 invoices) ───────────────────
            ("Ravi Krishnan",   "card", [("ELC-WIP-020", 2), ("PCL-TPT-150", 2), ("HLT-GTH-025", 2), ("BEV-MNG-1L", 1)]),
            ("Ravi Krishnan",   "upi",  [("HLT-OAT-500", 1), ("DBY-CHS-200", 1), ("IMS-KTC-500", 1)]),
            ("Ravi Krishnan",   "card", [("FRZ-PEA-500", 2), ("SNK-PRC-120", 2), ("BEV-CCF-200", 2)]),
            # ── High Value: Meera Joshi (3 invoices) ─────────────────────
            ("Meera Joshi",     "upi",  [("HLT-HNY-250", 1), ("HLT-OAT-500", 1), ("HLT-GTH-025", 2), ("FRZ-ICE-500", 1)]),
            ("Meera Joshi",     "card", [("DBY-CHS-200", 2), ("BEV-MNG-1L",  2), ("PCL-HWS-250", 1)]),
            ("Meera Joshi",     "upi",  [("IMS-KTC-500", 1), ("HLT-PBR-060", 3), ("SNK-PRC-120", 2)]),
            # ── Regular: Arjun Patel (2 invoices) ────────────────────────
            ("Arjun Patel",     "upi",  [("DBY-MLK-500", 5), ("DBY-BRD-400", 2)]),
            ("Arjun Patel",     "card", [("IMS-KTC-500", 1), ("BEV-CCF-200", 2), ("SNK-CHO-045", 2)]),
            # ── Regular: Neha Singh (2 invoices) ─────────────────────────
            ("Neha Singh",      "cash", [("HCL-FCL-1L",  1), ("HCL-DSW-500", 1), ("PCL-HWS-250", 1)]),
            ("Neha Singh",      "upi",  [("STN-NBK-A5",  3), ("STN-PEN-5P",  2), ("SNK-CHP-052", 4)]),
            # ── Regular: Pooja Menon (2 invoices) ────────────────────────
            ("Pooja Menon",     "card", [("PCL-TPT-150", 1), ("PCL-HWS-250", 1), ("ELC-WIP-020", 1)]),
            ("Pooja Menon",     "upi",  [("SNK-CHP-052", 3), ("BEV-WTR-1L",  4), ("IMS-NDL-070", 5)]),
            # ── Regular: Farhan Ali (2 invoices) ─────────────────────────
            ("Farhan Ali",      "cash", [("BEV-WTR-1L",  6), ("SNK-CHO-045", 3), ("IMS-NDL-070", 4)]),
            ("Farhan Ali",      "upi",  [("STN-NBK-A5",  2), ("STN-STK-100", 1), ("BEV-CCF-200", 1)]),
            # ── Regular: Divya Chaudhary (2 invoices) ────────────────────
            ("Divya Chaudhary", "card", [("PCL-FCW-100", 1), ("DBY-BTR-100", 2), ("SNK-PRC-120", 1)]),
            ("Divya Chaudhary", "upi",  [("BEV-ENG-250", 2), ("SNK-PNT-150", 2), ("IMS-NDL-070", 3)]),
            # ── Regular: Sneha Iyer (2 invoices) ─────────────────────────
            ("Sneha Iyer",      "upi",  [("BEV-MNG-1L",  1), ("SNK-CHO-045", 4), ("IMS-UPM-070", 2)]),
            ("Sneha Iyer",      "card", [("PCL-SHM-008", 5), ("STN-PEN-5P",  2), ("BEV-WTR-1L",  3)]),
            # ── Regular: Yash Mehta (2 invoices) ─────────────────────────
            ("Yash Mehta",      "cash", [("DBY-BRD-400", 2), ("DBY-MLK-500", 3), ("SNK-CHP-052", 2)]),
            ("Yash Mehta",      "upi",  [("IMS-NDL-070", 4), ("BEV-WTR-1L",  3), ("SNK-CHO-045", 2)]),
            # ── Low Value: single-purchase customers ──────────────────────
            ("Rohit Das",       "card", [("STN-NBK-A5",  2), ("STN-PEN-5P",  1)]),
            ("Kavita Rao",      "cash", [("BEV-WTR-1L",  3), ("IMS-NDL-070", 2)]),
            ("Suresh Kumar",    "upi",  [("SNK-CHP-052", 2), ("SNK-CHO-045", 1)]),
            ("Bhavna Shah",     "card", [("PCL-SHM-008", 3), ("STN-STK-100", 1)]),
            ("Nikhil Sharma",   "upi",  [("IMS-NDL-070", 3), ("BEV-WTR-1L",  2)]),
            ("Amrita Pillai",   "cash", [("DBY-BRD-400", 1), ("DBY-MLK-500", 2)]),
            ("Tarun Saxena",    "upi",  [("SNK-PNT-150", 1), ("BEV-WTR-1L",  2)]),
            ("Preeti Gupta",    "card", [("STN-PEN-5P",  2), ("PCL-SHM-008", 2)]),
        ]

        base_date = datetime.now(timezone.utc) - timedelta(days=35)
        n_baskets = len(baskets)

        # Historical prices for the first 20 invoices (populates price-drop eligible customers)
        old_price_map: Dict[str, float] = {
            "DBY-BRD-400":  55.0,   # now 50
            "HCL-DTG-1K":  235.0,   # now 210
            "IMS-KTC-500":  99.0,   # now 90
            "SNK-PRC-120":  72.0,   # now 65
            "BEV-CCF-200":  60.0,   # now 55
            "ELC-EAR-W01": 450.0,   # now 399
            "HLT-HNY-250": 210.0,   # now 185
            "FRZ-ICE-500": 165.0,   # now 145
        }

        for idx, (cust_name, payment_method, lines) in enumerate(baskets):
            customer = customer_map[cust_name]
            subtotal = 0.0
            tax_total = 0.0
            invoice_items: List[InvoiceItem] = []

            for sku, qty in lines:
                product = product_map[sku]
                if product.stock < qty:
                    continue

                # First 20 invoices use historical prices to populate price-drop eligible customers
                purchase_price = (
                    old_price_map[sku] if (idx < 20 and sku in old_price_map) else product.price
                )

                line_total = round(purchase_price * qty, 2)
                line_tax = round(line_total * (product.tax_rate / 100.0), 2)
                subtotal += line_total
                tax_total += line_tax
                product.stock -= qty

                invoice_items.append(
                    InvoiceItem(
                        product_id=product.id,
                        quantity=qty,
                        price_at_purchase=purchase_price,
                        tax_rate=product.tax_rate,
                        line_total=line_total,
                        line_tax=line_tax,
                    )
                )

            grand_total = round(subtotal + tax_total, 2)
            # Auto-compute cash tendered (round up to nearest ₹50)
            amount_tendered = None
            change_due = None
            if payment_method == "cash":
                amount_tendered = math.ceil(grand_total / 50) * 50
                change_due = round(amount_tendered - grand_total, 2)

            invoice = Invoice(
                customer_id=customer.id,
                subtotal=round(subtotal, 2),
                tax_amount=round(tax_total, 2),
                total_amount=grand_total,
                payment_method=payment_method,
                payment_status="paid",
                amount_tendered=amount_tendered,
                change_due=change_due,
                created_at=base_date + timedelta(days=idx * 35 // n_baskets),
            )
            db.add(invoice)
            db.flush()

            for it in invoice_items:
                it.invoice_id = invoice.id
                db.add(it)

        db.commit()

        print("Demo seed completed successfully.")
        print(f"Categories:  {len(category_names)}")
        print(f"Products:    {len(products_data)}")
        print(f"Customers:   {len(customers_data)}")
        print(f"Invoices:    {n_baskets}")

    finally:
        db.close()


if __name__ == "__main__":
    print("Resetting current business data...")
    reset_business_data()
    print("Seeding SmartPOS themed demo data...")
    seed_demo_data()
