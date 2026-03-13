import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# Ordered from best to lowest — K-means clusters are ranked by mean total_spent
SEGMENT_LABELS = ["VIP / High Value", "High Value", "Regular", "Low Value"]


def segment_customers(customer_rows):
    """
    K-Means customer segmentation using three features:
      - total_spent
      - total_invoices
      - avg_order_value

    Clusters are ranked by mean total_spent so the label with index 0
    (VIP / High Value) always maps to the highest-spending cluster.
    Falls back gracefully when fewer than 4 customers exist.
    """
    if not customer_rows:
        return []

    df = pd.DataFrame(customer_rows)

    if len(df) == 1:
        df["segment"] = SEGMENT_LABELS[2]  # single customer → Regular
        return df[["customer_id", "segment"]].to_dict(orient="records")

    # Feature engineering
    df["avg_order_value"] = (
        df["total_spent"] / df["total_invoices"].replace(0, 1)
    )

    X = df[["total_spent", "total_invoices", "avg_order_value"]].values.astype(float)

    # Normalise so no single feature dominates
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Use up to 4 clusters; never more than the number of customers
    n_clusters = min(4, len(df))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(X_scaled)

    # Rank clusters by mean total_spent (descending) and map to ordered labels
    cluster_rank = (
        df.groupby("cluster")["total_spent"]
        .mean()
        .sort_values(ascending=False)
        .index.tolist()
    )
    label_map = {cid: SEGMENT_LABELS[i] for i, cid in enumerate(cluster_rank)}
    df["segment"] = df["cluster"].map(label_map)

    return df[["customer_id", "segment"]].to_dict(orient="records")
