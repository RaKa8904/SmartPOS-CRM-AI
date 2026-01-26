from collections import defaultdict
from itertools import combinations

def build_bought_together_rules(invoices_items):
    """
    invoices_items format:
    [
      {"invoice_id": 1, "product_ids": [1,2,3]},
      {"invoice_id": 2, "product_ids": [1,2]},
    ]
    """

    pair_counts = defaultdict(int)
    product_counts = defaultdict(int)

    for inv in invoices_items:
        items = list(set(inv["product_ids"]))  # unique
        for p in items:
            product_counts[p] += 1

        for a, b in combinations(sorted(items), 2):
            pair_counts[(a, b)] += 1

    return pair_counts, product_counts


def recommend_for_product(product_id: int, pair_counts, top_k=5):
    scores = defaultdict(int)

    for (a, b), count in pair_counts.items():
        if a == product_id:
            scores[b] += count
        elif b == product_id:
            scores[a] += count

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return ranked[:top_k]
