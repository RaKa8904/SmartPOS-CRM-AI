from typing import List, Dict


def compute_ltv(customer_rows: List[Dict], lifespan_months: int = 24) -> List[Dict]:
    """
    Predict Customer Lifetime Value using a simplified BG/NBD-inspired formula:

        avg_order_value      = total_spent / total_invoices
        purchase_freq/month  = total_invoices / months_active
        predicted_ltv        = avg_order_value × freq × lifespan_months

    customer_rows – list of dicts:
        customer_id, name, phone, total_invoices, total_spent, customer_since_days

    Returns list sorted by predicted_ltv descending, with tier labels.
    """
    results = []
    for r in customer_rows:
        total_invoices = max(1, r.get("total_invoices", 1))
        total_spent = r.get("total_spent", 0.0)
        since_days = max(30, r.get("customer_since_days", 30))

        avg_order_value = total_spent / total_invoices
        months_active = since_days / 30.0
        purchase_freq = total_invoices / months_active          # per month
        predicted_ltv = avg_order_value * purchase_freq * lifespan_months

        if predicted_ltv >= 50_000:
            tier = "Platinum"
        elif predicted_ltv >= 20_000:
            tier = "Gold"
        elif predicted_ltv >= 5_000:
            tier = "Silver"
        else:
            tier = "Bronze"

        results.append(
            {
                "customer_id": r["customer_id"],
                "name": r["name"],
                "phone": r.get("phone"),
                "total_invoices": r.get("total_invoices", 0),
                "total_spent": round(total_spent, 2),
                "avg_order_value": round(avg_order_value, 2),
                "purchase_freq_per_month": round(purchase_freq, 2),
                "predicted_ltv": round(predicted_ltv, 2),
                "ltv_tier": tier,
            }
        )

    return sorted(results, key=lambda x: x["predicted_ltv"], reverse=True)
