from app.db.database import Base, engine
from app.models.category import Category  # noqa: F401 - registers table
from app.models.product import Product
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.customer import Customer
from app.models.price_history import ProductPriceHistory
from app.models.notification import Notification
from app.models.user import User
from sqlalchemy import text


def init_db():
    """Create all tables that don't exist yet, then run column migrations."""
    Base.metadata.create_all(bind=engine)
    _run_migrations()


def _run_migrations():
    """
    Safely add new columns to existing tables.
    Uses IF NOT EXISTS (PostgreSQL) so it is safe to run every startup.
    """
    migrations = [
        # GST / tax rate on products
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate FLOAT DEFAULT 18.0",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id)",
        # GST breakdown on invoices
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount FLOAT DEFAULT 0.0",
        # Payment method tracking
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash'",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'paid'",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_tendered FLOAT",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS change_due FLOAT",
        # GST per line item
        "ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_rate FLOAT DEFAULT 18.0",
        "ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS line_tax FLOAT DEFAULT 0.0",
        # RBAC role column
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'cashier'",
    ]

    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                conn.rollback()  # column may already exist on some DB dialects

if __name__ == "__main__":
    init_db()
    print("Tables created / migrated successfully!")
