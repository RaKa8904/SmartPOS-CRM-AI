from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerOut

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.post("/add", response_model=CustomerOut)
def add_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
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
def list_customers(db: Session = Depends(get_db)):
    return db.query(Customer).all()
