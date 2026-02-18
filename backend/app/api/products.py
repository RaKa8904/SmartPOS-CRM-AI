from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductOut

router = APIRouter(prefix="/products", tags=["Products"])


# ---------------- ADD PRODUCT ----------------
@router.post("/add", response_model=ProductOut)
def add_product(payload: ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(Product).filter(Product.sku == payload.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")

    product = Product(
        name=payload.name,
        sku=payload.sku,
        price=payload.price,
        stock=payload.stock
    )

    db.add(product)
    db.commit()
    db.refresh(product)
    return product


# ---------------- LIST PRODUCTS ----------------
@router.get("/list", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).all()


# ---------------- UPDATE PRODUCT ----------------
@router.put("/update/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.name = payload.name
    product.sku = payload.sku
    product.price = payload.price
    product.stock = payload.stock

    db.commit()
    db.refresh(product)
    return product


# ---------------- DELETE PRODUCT ----------------
@router.delete("/delete/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}


# ---------------- RESTOCK PRODUCT ----------------
@router.put("/restock/{product_id}")
def restock_product(product_id: int, payload: dict, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    quantity = payload.get("quantity", 0)
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Invalid quantity")

    product.stock += quantity
    db.commit()
    db.refresh(product)

    return product
