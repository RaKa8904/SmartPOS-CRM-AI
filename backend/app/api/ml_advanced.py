"""
ml_advanced.py – Business-facing ML endpoints:

  GET /ml/churn-risk          – Customer churn risk ranked list
  GET /ml/demand-forecast     – Product demand forecast (next 7 days)
  GET /ml/anomalies           – Invoice & price anomaly detection
  GET /ml/customer-ltv        – Customer lifetime value predictions
"""

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.deps import get_db
from app.core.dependencies import require_role
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.product import Product

from app.ml.churn_prediction import compute_churn_risk
from app.ml.demand_forecasting import build_demand_forecasts
from app.ml.anomaly_detection import detect_invoice_anomalies, detect_price_anomalies
from app.ml.customer_ltv import compute_ltv

router = APIRouter(prefix="/ml", tags=["ML"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# 1. Churn Risk
# ---------------------------------------------------------------------------

@router.get("/churn-risk")
def churn_risk(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    """
    Returns all customers scored by churn probability (0–100).
    High = likely to churn, Low = still active.
    """
    customers = db.query(Customer).all()
    now = datetime.now(timezone.utc)

    rows = []
    for c in customers:
        invoices = (
            db.query(Invoice)
            .filter(Invoice.customer_id == c.id)
            .order_by(Invoice.created_at.desc())
            .all()
        )
        total_invoices = len(invoices)
        total_spent = sum(inv.total_amount for inv in invoices)
        last_inv = invoices[0] if invoices else None
        last_purchase_date = _utc(last_inv.created_at) if last_inv else None

        created_at = _utc(c.created_at) or now
        customer_since_days = max(0, (now - created_at).days)

        rows.append(
            {
                "customer_id": c.id,
                "name": c.name,
                "phone": c.phone,
                "total_invoices": total_invoices,
                "total_spent": total_spent,
                "last_purchase_date": last_purchase_date,
                "customer_since_days": customer_since_days,
            }
        )

    return {"customers": compute_churn_risk(rows)}


# ---------------------------------------------------------------------------
# 2. Demand Forecast
# ---------------------------------------------------------------------------

@router.get("/demand-forecast")
def demand_forecast(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    """
    Forecast next-7-day demand for the top products by sales volume
    using a 30-day rolling linear-trend model.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    # Aggregate daily quantity sold per product
    rows = (
        db.query(
            InvoiceItem.product_id,
            func.date(Invoice.created_at).label("sale_date"),
            func.sum(InvoiceItem.quantity).label("qty"),
        )
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .filter(Invoice.created_at >= cutoff)
        .group_by(InvoiceItem.product_id, func.date(Invoice.created_at))
        .all()
    )

    # Build {product_id: {name, daily_sales}}
    product_sales: dict = defaultdict(lambda: {"name": "", "daily_sales": {}})
    for row in rows:
        product_sales[row.product_id]["daily_sales"][str(row.sale_date)] = float(
            row.qty
        )

    # Attach product names
    if product_sales:
        products = (
            db.query(Product)
            .filter(Product.id.in_(list(product_sales.keys())))
            .all()
        )
        for p in products:
            product_sales[p.id]["name"] = p.name

    forecasts = build_demand_forecasts(dict(product_sales), top_n=12)
    return {"forecasts": forecasts}


# ---------------------------------------------------------------------------
# 3. Anomaly Detection
# ---------------------------------------------------------------------------

@router.get("/anomalies")
def anomalies(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    """
    Detects statistical outliers in:
      - Invoice totals (last 90 days)
      - Product prices vs category peers
    """
    # ---- Invoice anomalies ----
    cutoff_90 = datetime.now(timezone.utc) - timedelta(days=90)
    inv_rows_db = (
        db.query(Invoice, Customer)
        .outerjoin(Customer, Customer.id == Invoice.customer_id)
        .filter(Invoice.created_at >= cutoff_90)
        .all()
    )

    invoice_rows = []
    for inv, cust in inv_rows_db:
        invoice_rows.append(
            {
                "invoice_id": inv.id,
                "total_amount": inv.total_amount,
                "created_at": str(_utc(inv.created_at))[:19],
                "customer_name": cust.name if cust else "Walk-in",
                "payment_method": inv.payment_method,
            }
        )

    invoice_anomalies = detect_invoice_anomalies(invoice_rows)

    # ---- Price anomalies ----
    products = db.query(Product).filter(Product.is_active == True).all()

    # Group prices by category_id to compute mean/std
    category_prices: dict = defaultdict(list)
    for p in products:
        key = p.category_id or 0
        category_prices[key].append(p.price)

    import numpy as np

    cat_stats: dict = {}
    for cat_id, prices in category_prices.items():
        arr = np.array(prices, dtype=float)
        cat_stats[cat_id] = {
            "mean": float(np.mean(arr)),
            "std": float(np.std(arr)) if len(arr) > 1 else 0.0,
        }

    product_rows = []
    for p in products:
        key = p.category_id or 0
        stats = cat_stats.get(key, {"mean": 0.0, "std": 0.0})
        product_rows.append(
            {
                "product_id": p.id,
                "name": p.name,
                "price": p.price,
                "category_id": p.category_id,
                "avg_category_price": stats["mean"],
                "std_category_price": stats["std"],
            }
        )

    price_anomalies = detect_price_anomalies(product_rows)

    return {
        "invoice_anomalies": invoice_anomalies[:20],
        "price_anomalies": price_anomalies[:20],
        "summary": {
            "invoices_scanned": len(invoice_rows),
            "invoice_flags": len(invoice_anomalies),
            "products_scanned": len(product_rows),
            "price_flags": len(price_anomalies),
        },
    }


# ---------------------------------------------------------------------------
# 4. Customer LTV
# ---------------------------------------------------------------------------

@router.get("/customer-ltv")
def customer_ltv(
    db: Session = Depends(get_db),
    _=Depends(require_role("admin", "manager")),
):
    """
    Predicts 24-month Customer Lifetime Value for every customer.
    Returns ranked list with tier badges: Platinum / Gold / Silver / Bronze.
    """
    customers = db.query(Customer).all()
    now = datetime.now(timezone.utc)

    rows = []
    for c in customers:
        invoices = db.query(Invoice).filter(Invoice.customer_id == c.id).all()
        total_spent = sum(inv.total_amount for inv in invoices)
        created_at = _utc(c.created_at) or now
        since_days = max(30, (now - created_at).days)

        rows.append(
            {
                "customer_id": c.id,
                "name": c.name,
                "phone": c.phone,
                "total_invoices": len(invoices),
                "total_spent": total_spent,
                "customer_since_days": since_days,
            }
        )

    ltv_list = compute_ltv(rows, lifespan_months=24)

    tier_counts = {"Platinum": 0, "Gold": 0, "Silver": 0, "Bronze": 0}
    for r in ltv_list:
        tier_counts[r["ltv_tier"]] = tier_counts.get(r["ltv_tier"], 0) + 1

    return {
        "customers": ltv_list,
        "tier_summary": tier_counts,
        "total_predicted_revenue": round(sum(r["predicted_ltv"] for r in ltv_list), 2),
    }
