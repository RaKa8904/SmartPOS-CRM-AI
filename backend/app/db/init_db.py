from app.db.database import Base, engine
from app.models.product import Product
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.customer import Customer
from app.models.price_history import ProductPriceHistory
from app.models.notification import Notification
from app.models.user import User

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    print("✅ Tables created successfully!")
