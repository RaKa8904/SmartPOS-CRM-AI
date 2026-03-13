from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductOut
from app.core.dependencies import require_role, get_current_user
from app.core.audit import write_audit_log

router = APIRouter(prefix="/products", tags=["Products"])


# ---------------- ADD PRODUCT ----------------
@router.post("/add", response_model=ProductOut)
def add_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    # Check only ACTIVE products for SKU conflict
    existing = db.query(Product).filter(
        Product.sku == payload.sku,
        Product.is_active == True
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")

    product = Product(
        name=payload.name,
        sku=payload.sku,
        price=payload.price,
        stock=payload.stock,
        tax_rate=payload.tax_rate,
        category_id=payload.category_id,
        is_active=True,
    )

    db.add(product)
    db.commit()
    db.refresh(product)
    return product


# ---------------- LIST PRODUCTS ----------------
@router.get("/list", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Product).filter(Product.is_active == True).all()


# ---------------- UPDATE PRODUCT ----------------
@router.put("/update/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.name = payload.name
    product.sku = payload.sku
    product.price = payload.price
    product.stock = payload.stock
    product.tax_rate = payload.tax_rate
    product.category_id = payload.category_id

    db.commit()
    db.refresh(product)
    return product


# ---------------- SOFT DELETE PRODUCT ----------------
@router.delete("/delete/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "manager")),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Soft delete instead of hard delete
    product.is_active = False
    write_audit_log(
        db,
        actor_email=current["email"],
        action="product_deleted",
        entity_type="product",
        entity_id=str(product.id),
        details={"name": product.name, "sku": product.sku},
    )
    db.commit()

    return {"message": "Product archived successfully"}


# ---------------- RESTOCK PRODUCT ----------------
@router.put("/restock/{product_id}")
def restock_product(
    product_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    quantity = payload.get("quantity", 0)

    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Invalid quantity")

    product.stock += quantity

    db.commit()
    db.refresh(product)

    return product
