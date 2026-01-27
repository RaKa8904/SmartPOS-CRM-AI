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
            SELECT DATE(created_at) AS date,
                   SUM(total_amount) AS revenue
            FROM invoices
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
        """)
    ).fetchall()

    return [
        {"date": str(r.date), "revenue": r.revenue}
        for r in rows
    ]
