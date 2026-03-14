from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.invoice_item import InvoiceItem
from app.models.product import Product
from app.ml.recommendations import build_bought_together_rules, recommend_for_product
from app.ml.recommendations import (
    build_bought_together_rules,
    recommend_for_product,
    recommend_for_product_v2,
)
from app.core.dependencies import require_role

router = APIRouter(prefix="/ml", tags=["ML"])

@router.get("/recommendations/{product_id}")
def get_recommendations(
    product_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
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

    total_invoices = len(invoice_map)

    # Use lift-based scoring when enough data exists; fallback to count-based
    if total_invoices >= 5:
        recs_v2 = recommend_for_product_v2(
            product_id, pair_counts, product_counts, total_invoices, top_k=5
        )
        output = []
        for rec_id, metrics in recs_v2:
            rec_product = db.query(Product).filter(Product.id == rec_id).first()
            if rec_product:
                output.append(
                    {
                        "product_id": rec_product.id,
                        "name": rec_product.name,
                        "sku": rec_product.sku,
                        "score": metrics["count"],
                        "confidence": metrics["confidence"],
                        "lift": metrics["lift"],
                        "support": metrics["support"],
                    }
                )
    else:
        recs = recommend_for_product(product_id, pair_counts, top_k=5)
        output = []
        for rec_id, score in recs:
            rec_product = db.query(Product).filter(Product.id == rec_id).first()
            if rec_product:
                output.append(
                    {
                        "product_id": rec_product.id,
                        "name": rec_product.name,
                        "sku": rec_product.sku,
                        "score": score,
                        "confidence": None,
                        "lift": None,
                        "support": None,
                    }
                )

    return {
        "for_product": {
            "id": product.id,
            "name": product.name,
            "sku": product.sku
        },
        "recommendations": output
    }
