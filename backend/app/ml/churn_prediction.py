from datetime import datetime, timezone
from typing import Optional, List, Dict


def _churn_score(
    last_purchase_date: Optional[datetime],
    total_invoices: int,
    total_spent: float,
    customer_since_days: int,
) -> dict:
    """
    Compute a 0–100 churn risk score using an RFM-lite model.

    Components
    ----------
    Recency   (0–60) – dominant signal; more days since last buy → higher risk
    Frequency (0–25) – fewer purchases/month → higher risk
    Monetary  (0–15) – lower avg spend → marginally higher risk
    """
    now = datetime.now(timezone.utc)

    # Recency
    if last_purchase_date is None:
        recency_days = customer_since_days or 999
    else:
        lp = last_purchase_date
        if lp.tzinfo is None:
            lp = lp.replace(tzinfo=timezone.utc)
        recency_days = max(0, (now - lp).days)

    recency_component = min(60.0, recency_days * (60.0 / 90.0))

    # Frequency (inverse: higher frequency = lower risk)
    months_active = max(1.0, customer_since_days / 30.0)
    invoices_per_month = total_invoices / months_active
    freq_component = max(0.0, 25.0 - invoices_per_month * 2.5)

    # Monetary (inverse: higher avg spend = marginally lower risk)
    avg_spend = total_spent / max(1, total_invoices)
    monetary_component = max(0.0, 15.0 - min(15.0, avg_spend / 100.0))

    score = min(100, int(round(recency_component + freq_component + monetary_component)))

    if score >= 65:
        level = "High"
        reason = f"No purchase in {recency_days} days; low engagement"
    elif score >= 35:
        level = "Medium"
        reason = f"Last purchase was {recency_days} days ago"
    else:
        level = "Low"
        reason = f"Active; last purchase {recency_days} days ago"

    return {
        "score": score,
        "level": level,
        "reason": reason,
        "recency_days": recency_days,
    }


def compute_churn_risk(customer_rows: List[Dict]) -> List[Dict]:
    """
    customer_rows – list of dicts with keys:
        customer_id, name, phone, total_invoices, total_spent,
        last_purchase_date (datetime | None), customer_since_days (int)

    Returns list sorted by churn score descending.
    """
    results = []
    for row in customer_rows:
        risk = _churn_score(
            last_purchase_date=row.get("last_purchase_date"),
            total_invoices=row.get("total_invoices", 0),
            total_spent=row.get("total_spent", 0.0),
            customer_since_days=row.get("customer_since_days", 0),
        )
        results.append(
            {
                "customer_id": row["customer_id"],
                "name": row["name"],
                "phone": row.get("phone"),
                "total_invoices": row.get("total_invoices", 0),
                "total_spent": round(row.get("total_spent", 0.0), 2),
                **risk,
            }
        )
    return sorted(results, key=lambda x: x["score"], reverse=True)
