from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.deps import get_db
from app.models.product import Product
from app.models.price_history import ProductPriceHistory
from app.core.dependencies import require_role
from app.core.audit import write_audit_log

router = APIRouter(prefix="/pricing", tags=["Pricing"])

class UpdatePriceRequest(BaseModel):
    product_id: int
    new_price: float

@router.post("/update")
def update_price(
    payload: UpdatePriceRequest,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "manager")),
):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if payload.new_price <= 0:
        raise HTTPException(status_code=400, detail="Price must be > 0")

    old_price = product.price
    if old_price == payload.new_price:
        return {"message": "Price unchanged", "product_id": product.id, "price": product.price}

    # log history
    history = ProductPriceHistory(
        product_id=product.id,
        old_price=old_price,
        new_price=payload.new_price
    )
    db.add(history)

    # update product
    product.price = payload.new_price
    write_audit_log(
        db,
        actor_email=current["email"],
        action="price_updated",
        entity_type="product",
        entity_id=str(product.id),
        details={"product_name": product.name, "old_price": old_price, "new_price": payload.new_price},
    )
    db.commit()

    return {
        "message": "Price updated successfully ✅",
        "product_id": product.id,
        "old_price": old_price,
        "new_price": payload.new_price
    }
