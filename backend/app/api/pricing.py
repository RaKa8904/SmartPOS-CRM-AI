from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.deps import get_db
from app.models.product import Product
from app.models.price_history import ProductPriceHistory

router = APIRouter(prefix="/pricing", tags=["Pricing"])

class UpdatePriceRequest(BaseModel):
    product_id: int
    new_price: float

@router.post("/update")
def update_price(payload: UpdatePriceRequest, db: Session = Depends(get_db)):
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
    db.commit()

    return {
        "message": "Price updated successfully ✅",
        "product_id": product.id,
        "old_price": old_price,
        "new_price": payload.new_price
    }
