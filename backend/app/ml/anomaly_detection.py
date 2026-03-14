from typing import List, Dict

import numpy as np


def detect_invoice_anomalies(invoice_rows: List[Dict]) -> List[Dict]:
    """
    Flag invoices whose total_amount is a statistical outlier (|z| ≥ 2.5).

    invoice_rows – list of dicts:
        invoice_id, total_amount, created_at (str), customer_name, cashier
    """
    if len(invoice_rows) < 5:
        return []

    amounts = np.array([r["total_amount"] for r in invoice_rows], dtype=float)
    mean = float(np.mean(amounts))
    std = float(np.std(amounts))

    if std < 1.0:
        return []

    anomalies = []
    for r in invoice_rows:
        z = (r["total_amount"] - mean) / std
        if abs(z) >= 2.5:
            direction = "unusually high" if z > 0 else "unusually low"
            anomalies.append(
                {
                    **r,
                    "z_score": round(z, 2),
                    "population_mean": round(mean, 2),
                    "population_std": round(std, 2),
                    "anomaly_type": "invoice_total",
                    "description": f"Invoice amount {direction} (z = {z:.2f})",
                }
            )

    return sorted(anomalies, key=lambda x: abs(x["z_score"]), reverse=True)


def detect_price_anomalies(product_rows: List[Dict]) -> List[Dict]:
    """
    Flag products whose price deviates significantly from the category mean.

    product_rows – list of dicts:
        product_id, name, category, price, avg_category_price, std_category_price
    """
    anomalies = []
    for r in product_rows:
        cat_mean = r.get("avg_category_price", 0.0)
        cat_std = r.get("std_category_price", 0.0)
        if cat_std < 1.0 or cat_mean <= 0:
            continue
        z = (r["price"] - cat_mean) / cat_std
        if abs(z) >= 2.0:
            direction = "overpriced" if z > 0 else "underpriced"
            anomalies.append(
                {
                    **r,
                    "z_score": round(z, 2),
                    "anomaly_type": "product_price",
                    "description": (
                        f"Price {direction} vs category average "
                        f"(₹{cat_mean:.0f} ± {cat_std:.0f}, z = {z:.2f})"
                    ),
                }
            )

    return sorted(anomalies, key=lambda x: abs(x["z_score"]), reverse=True)
