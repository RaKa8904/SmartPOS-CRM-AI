from app.db.database import Base, engine
from app.models.category import Category  # noqa: F401 - registers table
from app.models.product import Product
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.customer import Customer
from app.models.price_history import ProductPriceHistory, ScheduledPriceChange  # noqa: F401
from app.models.notification import Notification, NotificationTemplate, NotificationCampaign
from app.models.user import User
from app.models.auth_security import UserInvite, PasswordResetToken
from app.models.audit_log import AuditLog
from app.models.company import Company
from app.models.contact import Contact
from app.models.lead import Lead
from sqlalchemy import text


def init_db():
    """Create all tables that don't exist yet, run column migrations, and ensure default staff users."""
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    _ensure_default_users()
    _ensure_default_sales_pipeline()


def _ensure_default_users():
    from app.db.database import SessionLocal
    from app.core.security import hash_password

    db = SessionLocal()
    try:
        default_users = [
            {"email": "rahulsharma@acpce.ac.in",            "username": "Rahul Sharma", "role": "admin",    "password": "Sungjinwoo@8904"},
            {"email": "vikas.sharma.sales@smartpos.demo", "username": "Vikas Sharma", "role": "sales",    "password": "Sales@123"},
            {"email": "anita.roy.sales@smartpos.demo",    "username": "Anita Roy",    "role": "sales",    "password": "Sales@123"},
            {"email": "kabir.das.sales@smartpos.demo",    "username": "Kabir Das",    "role": "sales",    "password": "Sales@123"},
            {"email": "arjun.mehta.manager@smartpos.demo",  "username": "Arjun Mehta",  "role": "manager",  "password": "Manager@123"},
            {"email": "neha.verma.manager@smartpos.demo",   "username": "Neha Verma",   "role": "manager",  "password": "Manager@123"},
            {"email": "rohit.patel.cashier@smartpos.demo",  "username": "Rohit Patel",  "role": "cashier",  "password": "Cashier@123"},
            {"email": "priya.shah.cashier@smartpos.demo",   "username": "Priya Shah",   "role": "cashier",  "password": "Cashier@123"},
            {"email": "aman.khan.cashier@smartpos.demo",    "username": "Aman Khan",    "role": "cashier",  "password": "Cashier@123"},
        ]
        for entry in default_users:
            existing = db.query(User).filter(User.email == entry["email"]).first()
            if not existing:
                db.add(User(
                    email=entry["email"],
                    username=entry["username"],
                    role=entry["role"],
                    hashed_password=hash_password(entry["password"]),
                    is_active=True,
                    session_revoked=False,
                ))
            else:
                if existing.role != entry["role"]:
                    existing.role = entry["role"]
                existing.is_active = True
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error ensuring default users: {e}")
    finally:
        db.close()


def _ensure_default_sales_pipeline():
    from app.db.database import SessionLocal
    db = SessionLocal()
    try:
        if db.query(Company).count() > 0:
            return

        companies_data = [
            ("Apex Industrial Automation", "Manufacturing", "https://apexautomation.in", "Pune, Maharashtra"),
            ("Precision Tech India", "Aerospace & Defense", "https://precisiontech.in", "Bengaluru, Karnataka"),
            ("Nova Robotics", "Automation", "https://novarobotics.io", "Hyderabad, Telangana"),
            ("Bharat Forge Tech", "Heavy Engineering", "https://bharatforge.demo", "Mumbai, Maharashtra"),
            ("Titan Machinery Systems", "Industrial Goods", "https://titanmachinery.demo", "Chennai, Tamil Nadu"),
        ]

        company_map = {}
        for name, ind, web, addr in companies_data:
            comp = Company(name=name, industry=ind, website=web, address=addr)
            db.add(comp)
            db.flush()
            company_map[name] = comp

        contacts_data = [
            ("Apex Industrial Automation", "Rajesh", "Kumar", "rajesh.kumar@apexautomation.in", "+91 9823011223", "VP Procurement"),
            ("Precision Tech India", "Sunil", "Deshmukh", "sunil.d@precisiontech.in", "+91 9845022334", "Director Engineering"),
            ("Nova Robotics", "Meenakshi", "Sundaram", "meenakshi@novarobotics.io", "+91 9711033445", "Head of Operations"),
            ("Bharat Forge Tech", "Vikram", "Chawla", "vikram.chawla@bharatforge.demo", "+91 9892044556", "General Manager"),
            ("Titan Machinery Systems", "Kavita", "Subramanian", "kavita.s@titanmachinery.demo", "+91 9444055667", "Plant Head"),
        ]

        contact_map = {}
        for comp_name, fname, lname, email, phone, desig in contacts_data:
            comp = company_map[comp_name]
            cnt = Contact(company_id=comp.id, first_name=fname, last_name=lname, email=email, phone=phone, designation=desig)
            db.add(cnt)
            db.flush()
            contact_map[comp_name] = cnt

        sales_users = db.query(User).filter(User.role == "sales", User.is_active == True).order_by(User.id).all()
        sales_user_ids = [u.id for u in sales_users]

        leads_data = [
            ("Fiber Laser Cutter 6kW - Apex Plant 2", "Apex Industrial Automation", "New", 8500000.0, "Customer requested catalog and site survey for sheet metal shop."),
            ("Multi-Axis Laser Welding System", "Precision Tech India", "Contacted", 14500000.0, "Initial phone call completed; technical evaluation team reviewing specs."),
            ("Robotics Laser Marking Station", "Nova Robotics", "Demo Scheduled", 3800000.0, "Live product demonstration scheduled for next Tuesday."),
            ("Heavy Duty Laser Cladding Rig", "Bharat Forge Tech", "Negotiating", 22000000.0, "Commercial proposal submitted. Discount terms being finalized."),
            ("Precision Tube Laser Cutter", "Titan Machinery Systems", "Won", 12500000.0, "PO issued! Contract signed and advance payment received."),
        ]

        for idx, (title, comp_name, status, val, notes) in enumerate(leads_data):
            cnt = contact_map[comp_name]
            assigned_id = sales_user_ids[idx % len(sales_user_ids)] if sales_user_ids else None
            db.add(Lead(
                title=title,
                contact_id=cnt.id,
                assigned_user_id=assigned_id,
                status=status,
                estimated_value=val,
                notes=notes,
            ))

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error ensuring sales pipeline: {e}")
    finally:
        db.close()


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
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(80) DEFAULT ''",
        # User administration metadata
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS session_revoked BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0",
        # Notification templates and campaign history
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES notification_campaigns(id)",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES notification_templates(id)",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'EMAIL'",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS subject VARCHAR(255)",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(255)",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS error_message VARCHAR(500)",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ",
    ]

    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                conn.rollback()


if __name__ == "__main__":
    init_db()
    print("Tables created / migrated successfully!")
