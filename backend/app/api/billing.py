from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.product import Product
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.customer import Customer
from app.schemas.billing import CreateInvoiceRequest
from app.core.email_sender import send_email

router = APIRouter(prefix="/billing", tags=["Billing"])


# ---------------- EMAIL TEMPLATE ----------------

def generate_invoice_email(customer_name, invoice_id, items, total):
    rows = ""
    for item in items:
        rows += f"""
        <tr>
            <td>{item['name']}</td>
            <td>{item['quantity']}</td>
            <td>₹ {item['price']}</td>
            <td>₹ {item['line_total']}</td>
        </tr>
        """

    return f"""
    <h2>Invoice #{invoice_id}</h2>
    <p>Hello {customer_name},</p>
    <p>Thank you for shopping with SmartPOS.</p>

    <table border="1" cellpadding="8" cellspacing="0">
        <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
        </tr>
        {rows}
    </table>

    <h3>Total Amount: ₹ {total}</h3>

    <p>We appreciate your business.</p>
    """


# ---------------- CREATE INVOICE ----------------

@router.post("/create")
def create_invoice(
    payload: CreateInvoiceRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="No items provided")

    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    invoice = Invoice(total_amount=0.0, customer_id=payload.customer_id)
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    total = 0.0
    response_items = []

    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be > 0")

        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail="Not enough stock")

        product.stock -= item.quantity

        line_total = product.price * item.quantity
        total += line_total

        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=product.id,
            quantity=item.quantity,
            price_at_purchase=product.price,
            line_total=line_total,
        )
        db.add(invoice_item)

        response_items.append({
            "name": product.name,
            "quantity": item.quantity,
            "price": product.price,
            "line_total": line_total,
        })

    invoice.total_amount = total
    db.commit()

    # SEND EMAIL
    if customer.email:
        html_body = generate_invoice_email(
            customer.name,
            invoice.id,
            response_items,
            total
        )

        background_tasks.add_task(
            send_email,
            customer.email,
            f"Invoice #{invoice.id} - SmartPOS",
            html_body,
            True
        )

    return {
        "invoice_id": invoice.id,
        "customer_name": customer.name,
        "items": response_items,
        "total_amount": total,
        "message": "Invoice created successfully"
    }


# ---------------- NEW: GET INVOICE DETAILS ----------------

@router.get("/invoice/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()

    items = (
        db.query(InvoiceItem)
        .filter(InvoiceItem.invoice_id == invoice_id)
        .all()
    )

    formatted_items = []
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        formatted_items.append({
            "name": product.name if product else "Unknown",
            "quantity": item.quantity,
            "price": item.price_at_purchase,
            "line_total": item.line_total,
        })

    return {
        "invoice_id": invoice.id,
        "customer_name": customer.name if customer else "Unknown",
        "items": formatted_items,
        "total_amount": invoice.total_amount,
    }
