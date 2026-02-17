import pandas as pd


def segment_customers(customer_rows):
    """
    customer_rows: list of dicts like:
    [{"customer_id":1,"total_spent":5000,"total_invoices":10}, ...]
    """

    if not customer_rows:
        return []

    df = pd.DataFrame(customer_rows)

    # Sort customers by total_spent descending
    df = df.sort_values(by="total_spent", ascending=False).reset_index(drop=True)

    # Split into two halves
    midpoint = len(df) // 2

    df["segment"] = "Low Value"

    # Top half = VIP
    df.loc[:midpoint - 1, "segment"] = "VIP / High Value"

    return df[["customer_id", "segment"]].to_dict(orient="records")
