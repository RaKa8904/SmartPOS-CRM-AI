from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.product import Product
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.customer import Customer
from app.schemas.billing import CreateInvoiceRequest
from app.core.email_sender import send_email
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/billing", tags=["Billing"])


def generate_invoice_email(customer_name, invoice_id, items, subtotal, tax_amount, total, payment_method):
    rows = ""
    for item in items:
        rows += f"""
        <tr>
            <td>{item['name']}</td>
            <td>{item['quantity']}</td>
            <td>INR {item['price']:.2f}</td>
            <td>{item['tax_rate']}%</td>
            <td>INR {item['line_total']:.2f}</td>
        </tr>
        """

    return f"""
    <h2>Invoice #{invoice_id}</h2>
    <p>Hello {customer_name},</p>
    <p>Thank you for shopping with SmartPOS.</p>

    <table border="1" cellpadding="8" cellspacing="0">
        <tr>
            <th>Product</th><th>Qty</th><th>Price</th><th>GST %</th><th>Subtotal</th>
        </tr>
        {rows}
    </table>

    <hr/>
    <p><strong>Subtotal:</strong> INR {subtotal:.2f}</p>
    <p><strong>GST:</strong> INR {tax_amount:.2f}</p>
    <h3>Grand Total: INR {total:.2f}</h3>
    <p><em>Payment Method: {payment_method.upper()}</em></p>
    <p>We appreciate your business.</p>
    """


@router.post("/create")
def create_invoice(
    payload: CreateInvoiceRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="No items provided")

    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    valid_methods = {"cash", "card", "upi", "credit"}
    payment_method = payload.payment_method.lower()
    if payment_method not in valid_methods:
        raise HTTPException(status_code=400, detail=f"Invalid payment method. Use: {', '.join(valid_methods)}")

    invoice = Invoice(
        subtotal=0.0,
        tax_amount=0.0,
        total_amount=0.0,
        customer_id=payload.customer_id,
        payment_method=payment_method,
        payment_status="paid",
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    subtotal = 0.0
    tax_total = 0.0
    response_items = []

    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be > 0")

        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for '{product.name}' (available: {product.stock})",
            )

        product.stock -= item.quantity

        line_subtotal = product.price * item.quantity
        line_tax = round(line_subtotal * (product.tax_rate / 100.0), 2)

        subtotal += line_subtotal
        tax_total += line_tax

        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=product.id,
            quantity=item.quantity,
            price_at_purchase=product.price,
            tax_rate=product.tax_rate,
            line_total=line_subtotal,
            line_tax=line_tax,
        )
        db.add(invoice_item)

        response_items.append({
            "name": product.name,
            "quantity": item.quantity,
            "price": product.price,
            "tax_rate": product.tax_rate,
            "line_total": line_subtotal,
            "line_tax": line_tax,
        })

    grand_total = round(subtotal + tax_total, 2)

    invoice.subtotal = round(subtotal, 2)
    invoice.tax_amount = round(tax_total, 2)
    invoice.total_amount = grand_total

    if payment_method == "cash" and payload.amount_tendered is not None:
        if payload.amount_tendered < grand_total:
            raise HTTPException(status_code=400, detail="Amount tendered is less than total")
        invoice.amount_tendered = payload.amount_tendered
        invoice.change_due = round(payload.amount_tendered - grand_total, 2)

    db.commit()

    if customer.email:
        html_body = generate_invoice_email(
            customer.name,
            invoice.id,
            response_items,
            subtotal,
            tax_total,
            grand_total,
            payment_method,
        )
        background_tasks.add_task(
            send_email,
            customer.email,
            f"Invoice #{invoice.id} - SmartPOS",
            html_body,
            True,
        )

    return {
        "invoice_id": invoice.id,
        "customer_name": customer.name,
        "items": response_items,
        "subtotal": invoice.subtotal,
        "tax_amount": invoice.tax_amount,
        "total_amount": invoice.total_amount,
        "payment_method": invoice.payment_method,
        "change_due": invoice.change_due,
        "message": "Invoice created successfully",
    }


@router.get("/invoice/{invoice_id}")
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).all()

    formatted_items = []
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        formatted_items.append({
            "name": product.name if product else "Unknown",
            "quantity": item.quantity,
            "price": item.price_at_purchase,
            "tax_rate": item.tax_rate,
            "line_total": item.line_total,
            "line_tax": item.line_tax,
        })

    return {
        "invoice_id": invoice.id,
        "customer_name": customer.name if customer else "Unknown",
        "items": formatted_items,
        "subtotal": invoice.subtotal,
        "tax_amount": invoice.tax_amount,
        "total_amount": invoice.total_amount,
        "payment_method": invoice.payment_method,
        "payment_status": invoice.payment_status,
        "change_due": invoice.change_due,
    }
