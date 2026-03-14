from collections import defaultdict
from itertools import combinations
from typing import List, Dict, Tuple


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


def recommend_for_product_v2(
    product_id: int,
    pair_counts,
    product_counts,
    total_invoices: int,
    top_k: int = 5,
) -> List[Tuple[int, Dict]]:
    """
    Return recommendations scored by lift (association rule mining).

    lift = confidence(A→B) / support(B)
         = P(A∩B) / (P(A) × P(B))

    Higher lift means the two products are bought together far more often
    than random chance would predict — a much stronger signal than raw count.
    """
    if total_invoices == 0:
        return []

    scores: Dict[int, Dict] = {}
    for (a, b), count in pair_counts.items():
        if a == product_id:
            other = b
        elif b == product_id:
            other = a
        else:
            continue

        support_ab = count / total_invoices
        support_a = product_counts.get(product_id, 0) / total_invoices
        support_b = product_counts.get(other, 0) / total_invoices

        confidence = support_ab / support_a if support_a > 0 else 0.0
        lift = confidence / support_b if support_b > 0 else 0.0

        scores[other] = {
            "count": count,
            "support": round(support_ab, 4),
            "confidence": round(confidence, 4),
            "lift": round(lift, 4),
        }

    ranked = sorted(scores.items(), key=lambda x: x[1]["lift"], reverse=True)
    return ranked[:top_k]
