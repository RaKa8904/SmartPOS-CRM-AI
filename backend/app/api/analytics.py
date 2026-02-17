from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.deps import get_db
from sqlalchemy import text

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db)):
    total_revenue = db.execute(
        text("SELECT COALESCE(SUM(total_amount), 0) FROM invoices")
    ).scalar()

    total_customers = db.execute(
        text("SELECT COUNT(*) FROM customers")
    ).scalar()

    total_products = db.execute(
        text("SELECT COUNT(*) FROM products")
    ).scalar()

    return {
        "revenue": total_revenue,
        "customers": total_customers,
        "products": total_products,
    }


@router.get("/revenue-trend")
def revenue_trend(db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT 
                DATE(created_at) AS date,
                SUM(total_amount) AS revenue
            FROM invoices
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        """)
    ).fetchall()

    return [
        {
            "date": str(row.date),
            "revenue": float(row.revenue)
        }
        for row in rows
    ]

@router.get("/top-products")
def top_products(db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT
                p.id AS product_id,
                p.name AS name,
                SUM(ii.quantity) AS units_sold,
                SUM(ii.quantity * ii.price_at_purchase) AS revenue
            FROM invoice_items ii
            JOIN products p ON p.id = ii.product_id
            GROUP BY p.id, p.name
            ORDER BY revenue DESC
            LIMIT 10
        """)
    ).fetchall()

    return [
        {
            "product_id": row.product_id,
            "name": row.name,
            "units_sold": int(row.units_sold or 0),
            "revenue": float(row.revenue or 0),
        }
        for row in rows
    ]
