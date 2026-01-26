from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.product import Product
from app.models.price_history import ProductPriceHistory
from app.ml.price_prediction import predict_next_price

router = APIRouter(prefix="/ml", tags=["ML"])

@router.get("/predict-price/{product_id}")
def predict_price(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    history = (
        db.query(ProductPriceHistory)
        .filter(ProductPriceHistory.product_id == product_id)
        .order_by(ProductPriceHistory.changed_at.asc())
        .all()
    )

    rows = [{"old_price": h.old_price, "new_price": h.new_price} for h in history]

    pred = predict_next_price(rows)

    if pred is None:
        return {
            "product_id": product.id,
            "product_name": product.name,
            "current_price": product.price,
            "message": "Not enough price history to predict (need 2+ changes)"
        }

    return {
        "product_id": product.id,
        "product_name": product.name,
        "current_price": product.price,
        "predicted_next_price": pred
    }
