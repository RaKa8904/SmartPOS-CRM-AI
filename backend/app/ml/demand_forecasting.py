from datetime import date, timedelta
from typing import Dict, List

import numpy as np
from sklearn.linear_model import LinearRegression


def forecast_product_demand(
    product_id: int,
    product_name: str,
    daily_sales: Dict[str, float],
    window_days: int = 30,
    forecast_days: int = 7,
) -> dict:
    """
    Fit a linear trend on the last `window_days` of daily sales and project
    the next `forecast_days`.

    daily_sales – {date_string (YYYY-MM-DD): qty_sold}
    """
    today = date.today()
    all_dates = [(today - timedelta(days=window_days - 1 - i)) for i in range(window_days)]
    y = np.array([daily_sales.get(str(d), 0.0) for d in all_dates], dtype=float)
    X = np.arange(len(y)).reshape(-1, 1)

    model = LinearRegression()
    model.fit(X, y)

    forecast = []
    for i in range(forecast_days):
        future_x = np.array([[len(y) + i]])
        pred = max(0.0, float(model.predict(future_x)[0]))
        forecast.append(
            {
                "date": str(today + timedelta(days=i + 1)),
                "predicted_qty": round(pred, 1),
            }
        )

    slope = float(model.coef_[0])
    if slope > 0.15:
        trend = "rising"
    elif slope < -0.15:
        trend = "falling"
    else:
        trend = "stable"

    avg_daily = float(np.mean(y))
    predicted_7d_total = sum(f["predicted_qty"] for f in forecast)

    return {
        "product_id": product_id,
        "product_name": product_name,
        "avg_daily_sold": round(avg_daily, 2),
        "trend": trend,
        "predicted_7d_total": round(predicted_7d_total, 1),
        "forecast": forecast,
    }


def build_demand_forecasts(
    product_sales_map: Dict[int, Dict],
    top_n: int = 10,
) -> List[dict]:
    """
    product_sales_map – {product_id: {name, daily_sales: {date_str: qty}}}
    Returns forecasts for the top_n products sorted by avg daily demand.
    """
    results = [
        forecast_product_demand(
            product_id=pid,
            product_name=info["name"],
            daily_sales=info.get("daily_sales", {}),
        )
        for pid, info in product_sales_map.items()
    ]
    results.sort(key=lambda x: x["avg_daily_sold"], reverse=True)
    return results[:top_n]
