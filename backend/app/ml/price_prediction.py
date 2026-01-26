import numpy as np
from sklearn.linear_model import LinearRegression

def predict_next_price(price_history_rows):
    """
    price_history_rows: list of dicts like:
    [{"old_price":50,"new_price":45}, {"old_price":45,"new_price":40}]
    We'll use new_price sequence.
    """

    if len(price_history_rows) < 2:
        return None

    prices = [r["new_price"] for r in price_history_rows]
    y = np.array(prices).reshape(-1, 1)

    # X = [0,1,2,...]
    X = np.arange(len(prices)).reshape(-1, 1)

    model = LinearRegression()
    model.fit(X, y)

    next_x = np.array([[len(prices)]])
    pred = model.predict(next_x)[0][0]

    return float(pred)
