# backend/scripts/seed_data.py

from faker import Faker
import random
from datetime import datetime
from sqlalchemy import text

from app.db.database import SessionLocal
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem

fake = Faker()

db = SessionLocal()

# ------------------ CONFIG ------------------
NUM_CUSTOMERS = 25
NUM_PRODUCTS = 15
NUM_INVOICES = 120
# --------------------------------------------


def clear_tables():
    print("⚠️ Clearing tables...")

    db = SessionLocal()

    try:
        # CHILD TABLES FIRST
        db.execute(text("DELETE FROM notifications"))
        db.execute(text("DELETE FROM invoice_items"))
        db.execute(text("DELETE FROM invoices"))
        db.execute(text("DELETE FROM product_price_history"))

        # PARENT TABLES
        db.execute(text("DELETE FROM customers"))
        db.execute(text("DELETE FROM products"))

        db.commit()
        print("✅ Tables cleared successfully")

    except Exception as e:
        db.rollback()
        raise e

    finally:
        db.close()



def seed_customers():
    print("👥 Seeding customers...")
    customers = []

    for _ in range(NUM_CUSTOMERS):
        c = Customer(
            name=fake.name(),
            phone=fake.msisdn()[:10],
            email=fake.email(),
            created_at=datetime.utcnow()
        )
        db.add(c)
        customers.append(c)

    db.commit()
    return customers


def seed_products():
    print("📦 Seeding products...")
    products = []

    for _ in range(NUM_PRODUCTS):
        base_price = random.randint(20, 200)
        p = Product(
            name=fake.word().capitalize(),
            sku=fake.bothify(text="SKU-####"),
            price=base_price
        )
        db.add(p)
        products.append(p)

    db.commit()
    return products


def seed_invoices(customers, products):
    print("🧾 Seeding invoices...")

    for _ in range(NUM_INVOICES):
        customer = random.choice(customers)

        invoice = Invoice(
            customer_id=customer.id,
            total_amount=0,
            created_at=fake.date_time_this_year()
        )
        db.add(invoice)
        db.flush()  # get invoice.id

        total = 0
        for _ in range(random.randint(2, 5)):
            product = random.choice(products)

            # simulate historical price fluctuation
            price_paid = product.price + random.randint(-10, 20)
            qty = random.randint(1, 3)
            line_total = price_paid * qty

            item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=product.id,
                quantity=qty,
                price_at_purchase=price_paid,
                line_total=line_total
            )

            total += line_total
            db.add(item)

        invoice.total_amount = total

    db.commit()


def main():
    clear_tables()
    customers = seed_customers()
    products = seed_products()
    seed_invoices(customers, products)

    print("✅ Dummy data seeded successfully!")


if __name__ == "__main__":
    main()
