import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

def segment_customers(customer_rows):
    """
    customer_rows: list of dicts like:
    [{"customer_id":1,"total_spent":5000,"total_invoices":10}, ...]
    """

    if len(customer_rows) < 2:
        return [{"customer_id": r["customer_id"], "segment": 0} for r in customer_rows]

    df = pd.DataFrame(customer_rows)

    X = df[["total_spent", "total_invoices"]]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    k = min(3, len(df))  # max 3 clusters
    model = KMeans(n_clusters=k, random_state=42, n_init=10)
    df["segment"] = model.fit_predict(X_scaled)

    return df[["customer_id", "segment"]].to_dict(orient="records")
