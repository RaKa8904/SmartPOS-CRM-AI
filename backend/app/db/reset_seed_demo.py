from __future__ import annotations

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
    db = SessionLocal()
    try:
        # ---------------- CATEGORIES ----------------
        categories = [
            "Beverages",
            "Snacks",
            "Dairy & Bakery",
            "Instant Meals",
            "Personal Care",
            "Home & Cleaning",
            "Stationery",
        ]
        category_map: Dict[str, Category] = {}
        for name in categories:
            c = Category(name=name)
            db.add(c)
            db.flush()
            category_map[name] = c

        # ---------------- PRODUCTS ----------------
        # name, sku, category, price, tax_rate, stock
        products_data: List[Tuple[str, str, str, float, float, int]] = [
            ("Mineral Water 1L", "BEV-WTR-1L", "Beverages", 20.0, 5.0, 220),
            ("Cold Coffee Can", "BEV-CCF-200", "Beverages", 55.0, 12.0, 150),
            ("Mango Juice 1L", "BEV-MNG-1L", "Beverages", 110.0, 12.0, 90),
            ("Salted Chips 52g", "SNK-CHP-052", "Snacks", 20.0, 12.0, 200),
            ("Chocolate Bar", "SNK-CHO-045", "Snacks", 30.0, 12.0, 190),
            ("Protein Cookies", "SNK-PRC-120", "Snacks", 65.0, 12.0, 120),
            ("Whole Wheat Bread", "DBY-BRD-400", "Dairy & Bakery", 50.0, 5.0, 110),
            ("Toned Milk 500ml", "DBY-MLK-500", "Dairy & Bakery", 30.0, 5.0, 180),
            ("Cheese Slices 200g", "DBY-CHS-200", "Dairy & Bakery", 125.0, 12.0, 80),
            ("Masala Noodles", "IMS-NDL-070", "Instant Meals", 18.0, 5.0, 260),
            ("Ready Upma Cup", "IMS-UPM-070", "Instant Meals", 45.0, 12.0, 130),
            ("Tomato Ketchup 500g", "IMS-KTC-500", "Instant Meals", 90.0, 12.0, 95),
            ("Toothpaste 150g", "PCL-TPT-150", "Personal Care", 75.0, 18.0, 140),
            ("Shampoo Sachet", "PCL-SHM-008", "Personal Care", 3.0, 18.0, 1000),
            ("Hand Wash 250ml", "PCL-HWS-250", "Personal Care", 95.0, 18.0, 120),
            ("Dishwash Liquid 500ml", "HCL-DSW-500", "Home & Cleaning", 110.0, 18.0, 90),
            ("Floor Cleaner 1L", "HCL-FCL-1L", "Home & Cleaning", 165.0, 18.0, 70),
            ("Laundry Detergent 1kg", "HCL-DTG-1K", "Home & Cleaning", 210.0, 18.0, 75),
            ("Notebook A5", "STN-NBK-A5", "Stationery", 45.0, 12.0, 110),
            ("Blue Pen Pack (5)", "STN-PEN-5P", "Stationery", 50.0, 12.0, 120),
        ]

        product_map: Dict[str, Product] = {}
        for name, sku, cat_name, price, tax_rate, stock in products_data:
            p = Product(
                name=name,
                sku=sku,
                price=price,
                stock=stock,
                tax_rate=tax_rate,
                category_id=category_map[cat_name].id,
                is_active=True,
            )
            db.add(p)
            db.flush()
            product_map[sku] = p

        # ---------------- CUSTOMERS ----------------
        customers_data = [
            ("Rahul Sharma", "9876500011", "rahul.sharma@smartposdemo.com"),
            ("Ananya Verma", "9876500012", "ananya.verma@smartposdemo.com"),
            ("Vikram Mehta", "9876500013", "vikram.mehta@smartposdemo.com"),
            ("Priya Nair", "9876500014", "priya.nair@smartposdemo.com"),
            ("Arjun Patel", "9876500015", "arjun.patel@smartposdemo.com"),
            ("Neha Singh", "9876500016", "neha.singh@smartposdemo.com"),
            ("Rohit Das", "9876500017", "rohit.das@smartposdemo.com"),
            ("Sneha Iyer", "9876500018", "sneha.iyer@smartposdemo.com"),
            ("Karan Malhotra", "9876500019", "karan.malhotra@smartposdemo.com"),
            ("Pooja Menon", "9876500020", "pooja.menon@smartposdemo.com"),
        ]

        customer_map: Dict[str, Customer] = {}
        for name, phone, email in customers_data:
            c = Customer(name=name, phone=phone, email=email)
            db.add(c)
            db.flush()
            customer_map[name] = c

        # ---------------- PRICE HISTORY ----------------
        price_moves = [
            ("HCL-DTG-1K", 235.0, 220.0),
            ("HCL-DTG-1K", 220.0, 210.0),
            ("IMS-KTC-500", 99.0, 95.0),
            ("IMS-KTC-500", 95.0, 90.0),
            ("SNK-PRC-120", 72.0, 65.0),
            ("BEV-CCF-200", 60.0, 55.0),
            ("DBY-BRD-400", 55.0, 50.0),
        ]

        for sku, old_price, new_price in price_moves:
            db.add(
                ProductPriceHistory(
                    product_id=product_map[sku].id,
                    old_price=old_price,
                    new_price=new_price,
                )
            )

        # ---------------- INVOICES + ITEMS ----------------
        # customer, payment_method, amount_tendered(optional), list[(sku, qty)]
        baskets = [
            ("Rahul Sharma", "cash", 300.0, [("DBY-BRD-400", 2), ("IMS-KTC-500", 1), ("SNK-CHP-052", 2)]),
            ("Ananya Verma", "upi", None, [("BEV-CCF-200", 2), ("SNK-PRC-120", 1)]),
            ("Vikram Mehta", "card", None, [("HCL-DTG-1K", 1), ("PCL-TPT-150", 2)]),
            ("Priya Nair", "cash", 500.0, [("IMS-NDL-070", 6), ("BEV-WTR-1L", 4), ("SNK-CHO-045", 3)]),
            ("Arjun Patel", "upi", None, [("DBY-MLK-500", 5), ("DBY-BRD-400", 1)]),
            ("Neha Singh", "cash", 600.0, [("HCL-FCL-1L", 2), ("HCL-DSW-500", 1), ("PCL-HWS-250", 1)]),
            ("Rohit Das", "card", None, [("STN-NBK-A5", 3), ("STN-PEN-5P", 2)]),
            ("Sneha Iyer", "upi", None, [("BEV-MNG-1L", 1), ("SNK-CHO-045", 4), ("IMS-UPM-070", 2)]),
            ("Karan Malhotra", "cash", 800.0, [("HCL-DTG-1K", 2), ("HCL-FCL-1L", 1), ("BEV-WTR-1L", 6)]),
            ("Pooja Menon", "card", None, [("PCL-TPT-150", 1), ("PCL-HWS-250", 2), ("SNK-CHP-052", 3)]),
            ("Rahul Sharma", "upi", None, [("BEV-CCF-200", 1), ("SNK-PRC-120", 2), ("DBY-CHS-200", 1)]),
            ("Ananya Verma", "cash", 400.0, [("IMS-UPM-070", 3), ("IMS-NDL-070", 4), ("BEV-WTR-1L", 2)]),
            ("Priya Nair", "card", None, [("STN-NBK-A5", 2), ("SNK-CHO-045", 2), ("BEV-MNG-1L", 1)]),
            ("Arjun Patel", "upi", None, [("DBY-MLK-500", 4), ("DBY-BRD-400", 2), ("IMS-KTC-500", 1)]),
        ]

        base_date = datetime.now(timezone.utc) - timedelta(days=21)

        for idx, (cust_name, payment_method, amount_tendered, lines) in enumerate(baskets):
            customer = customer_map[cust_name]
            subtotal = 0.0
            tax_total = 0.0
            invoice_items: List[InvoiceItem] = []

            for sku, qty in lines:
                product = product_map[sku]
                if product.stock < qty:
                    continue

                line_total = round(product.price * qty, 2)
                line_tax = round(line_total * (product.tax_rate / 100.0), 2)
                subtotal += line_total
                tax_total += line_tax
                product.stock -= qty

                invoice_items.append(
                    InvoiceItem(
                        product_id=product.id,
                        quantity=qty,
                        price_at_purchase=product.price,
                        tax_rate=product.tax_rate,
                        line_total=line_total,
                        line_tax=line_tax,
                    )
                )

            grand_total = round(subtotal + tax_total, 2)
            change_due = None
            if payment_method == "cash" and amount_tendered is not None and amount_tendered >= grand_total:
                change_due = round(amount_tendered - grand_total, 2)

            invoice = Invoice(
                customer_id=customer.id,
                subtotal=round(subtotal, 2),
                tax_amount=round(tax_total, 2),
                total_amount=grand_total,
                payment_method=payment_method,
                payment_status="paid",
                amount_tendered=amount_tendered if payment_method == "cash" else None,
                change_due=change_due,
                created_at=base_date + timedelta(days=idx),
            )
            db.add(invoice)
            db.flush()

            for it in invoice_items:
                it.invoice_id = invoice.id
                db.add(it)

        db.commit()

        print("Demo seed completed successfully.")
        print(f"Categories: {len(categories)}")
        print(f"Products: {len(products_data)}")
        print(f"Customers: {len(customers_data)}")
        print(f"Invoices: {len(baskets)}")

    finally:
        db.close()


if __name__ == "__main__":
    print("Resetting current business data...")
    reset_business_data()
    print("Seeding SmartPOS themed demo data...")
    seed_demo_data()
