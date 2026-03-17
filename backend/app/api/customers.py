from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.schemas.customer import CustomerCreate, CustomerOut, CustomerUpdate
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.post("/add", response_model=CustomerOut)
def add_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    existing_phone = db.query(Customer).filter(Customer.phone == payload.phone).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone already exists")

    if payload.email:
        existing_email = db.query(Customer).filter(Customer.email == payload.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already exists")

    customer = Customer(
        name=payload.name,
        phone=payload.phone,
        email=payload.email
    )

    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.get("/list", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Customer).all()


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        customer.name = payload.name.strip()

    if payload.phone is not None:
        phone = payload.phone.strip()
        if not phone:
            raise HTTPException(status_code=400, detail="Phone cannot be empty")
        existing_phone = (
            db.query(Customer)
            .filter(Customer.phone == phone, Customer.id != customer_id)
            .first()
        )
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone already exists")
        customer.phone = phone

    if payload.email is not None:
        email = payload.email.strip() or None
        if email:
            existing_email = (
                db.query(Customer)
                .filter(Customer.email == email, Customer.id != customer_id)
                .first()
            )
            if existing_email:
                raise HTTPException(status_code=400, detail="Email already exists")
        customer.email = email

    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    existing_invoices = db.query(Invoice).filter(Invoice.customer_id == customer_id).first()
    if existing_invoices:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete customer with invoice history",
        )

    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted"}
