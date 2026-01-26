from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.invoice_item import InvoiceItem
from app.models.product import Product
from app.ml.recommendations import build_bought_together_rules, recommend_for_product

router = APIRouter(prefix="/ml", tags=["ML"])

@router.get("/recommendations/{product_id}")
def get_recommendations(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # collect invoice -> products list
    items = db.query(InvoiceItem).all()

    invoice_map = {}
    for it in items:
        invoice_map.setdefault(it.invoice_id, []).append(it.product_id)

    invoices_items = [{"invoice_id": k, "product_ids": v} for k, v in invoice_map.items()]

    pair_counts, product_counts = build_bought_together_rules(invoices_items)

    recs = recommend_for_product(product_id, pair_counts, top_k=5)

    output = []
    for rec_id, score in recs:
        rec_product = db.query(Product).filter(Product.id == rec_id).first()
        if rec_product:
            output.append({
                "product_id": rec_product.id,
                "name": rec_product.name,
                "sku": rec_product.sku,
                "score": score
            })

    return {
        "for_product": {
            "id": product.id,
            "name": product.name,
            "sku": product.sku
        },
        "recommendations": output
    }
