import { useEffect, useState } from "react";
import { api } from "../api";

/* ---------------- TYPES ---------------- */

type Product = {
  id: number;
  name: string;
  price?: number;
  sku?: string;
};

type CustomerSegment = {
  customer_id: number;
  name: string;
  phone?: string | null;
  total_spent: number;
  total_invoices: number;
  segment: string;
};

type RecommendationItem = {
  product_id: number;
  name: string;
  sku?: string;
  score: number;
};

type RecommendationResponse = {
  for_product?: {
    id: number;
    name: string;
    sku?: string;
  };
  recommendations?: RecommendationItem[];
};

type PredictPriceResponse = {
  product_id?: number;
  product_name?: string;
  current_price?: number;
  predicted_next_price?: number;
};

/* ---------------- COMPONENT ---------------- */

export default function MLInsights() {
  const [products, setProducts] = useState<Product[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSegments, setLoadingSegments] = useState(false);

  const [selectedRecProductId, setSelectedRecProductId] =
    useState<number | "">("");
  const [recData, setRecData] = useState<RecommendationResponse | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);

  const [selectedPredProductId, setSelectedPredProductId] =
    useState<number | "">("");
  const [predData, setPredData] = useState<PredictPriceResponse | null>(null);
  const [loadingPred, setLoadingPred] = useState(false);

  /* ---------------- FETCHERS ---------------- */

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>("/products/list");
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Products error:", err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCustomerSegments = async () => {
    setLoadingSegments(true);
    try {
      const res = await api.get<CustomerSegment[]>("/ml/customer-segments");
      setSegments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Segments error:", err);
      setSegments([]);
    } finally {
      setLoadingSegments(false);
    }
  };

  const fetchRecommendations = async (productId: number) => {
    setLoadingRec(true);
    try {
      const res = await api.get<RecommendationResponse>(
        `/ml/recommendations/${productId}`
      );
      setRecData(res.data ?? null);
    } catch (err) {
      console.error("Recommendations error:", err);
      setRecData(null);
    } finally {
      setLoadingRec(false);
    }
  };

  const fetchPredictedPrice = async (productId: number) => {
    setLoadingPred(true);
    try {
      const res = await api.get<PredictPriceResponse>(
        `/ml/predict-price/${productId}`
      );
      setPredData(res.data ?? null);
    } catch (err) {
      console.error("Prediction error:", err);
      setPredData(null);
    } finally {
      setLoadingPred(false);
    }
  };

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    fetchProducts();
    fetchCustomerSegments();
  }, []);

  useEffect(() => {
    if (!selectedRecProductId) {
      setRecData(null);
      return;
    }
    fetchRecommendations(Number(selectedRecProductId));
  }, [selectedRecProductId]);

  useEffect(() => {
    if (!selectedPredProductId) {
      setPredData(null);
      return;
    }
    fetchPredictedPrice(Number(selectedPredProductId));
  }, [selectedPredProductId]);

  /* ---------------- HELPERS ---------------- */

  const segmentLabel = (segment: string) => {
    return segment || "Low Value";
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* CUSTOMER SEGMENTS */}
      <div className="lg:col-span-3 glass-card rounded-2xl p-5 fade-in">
        <div className="flex items-center justify-between">
          <h2 className="section-title text-gradient">Customer Segments</h2>
          <button
            onClick={fetchCustomerSegments}
            disabled={loadingSegments}
            className="input-surface px-3 py-1 rounded-lg text-sm w-auto"
          >
            {loadingSegments ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loadingSegments ? (
          <p className="text-zinc-400 mt-4">Loading segments...</p>
        ) : segments.length === 0 ? (
          <p className="text-zinc-500 mt-4">No segment data found.</p>
        ) : (
          <div className="mt-4 overflow-auto rounded-xl border border-[#33437f]/35 bg-[#0d1635]/55 p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-300/85 border-b border-[#33437f]/35">
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Phone</th>
                  <th className="text-left py-2">Spent</th>
                  <th className="text-left py-2">Invoices</th>
                  <th className="text-left py-2">Segment</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((c) => (
                  <tr key={c.customer_id} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25 hover:bg-[#203063]/28 transition">
                    <td className="py-2">{c.name}</td>
                    <td className="py-2">{c.phone ?? "-"}</td>
                    <td className="py-2">₹ {c.total_spent}</td>
                    <td className="py-2">{c.total_invoices}</td>
                    <td className="py-2">
                      <span className="px-2 py-1 rounded-lg text-xs bg-cyan-400/15 text-cyan-200 border border-cyan-300/25">
                        {segmentLabel(c.segment)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECOMMENDATIONS */}
      <div className="glass-card rounded-2xl p-5 fade-in stagger-1">
        <h2 className="section-title">Recommendations</h2>

        <select
          className="input-surface mt-3"
          value={selectedRecProductId}
          onChange={(e) =>
            setSelectedRecProductId(e.target.value ? Number(e.target.value) : "")
          }
          disabled={loadingProducts}
        >
          <option value="">-- Select Product --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div className="mt-4">
          {loadingRec ? (
            <p className="text-zinc-400">Loading...</p>
          ) : recData?.recommendations?.length ? (
            recData.recommendations.map((r) => (
              <div
                key={r.product_id}
                className="mt-2 p-3 bg-[#0d1635]/55 border border-[#33437f]/30 rounded-xl"
              >
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-zinc-500">Score: {r.score}</p>
              </div>
            ))
          ) : (
            <p className="text-zinc-500">No recommendations.</p>
          )}
        </div>
      </div>

      {/* PREDICT PRICE */}
      <div className="glass-card rounded-2xl p-5 fade-in stagger-2">
        <h2 className="section-title">Predict Price</h2>

        <select
          className="input-surface mt-3"
          value={selectedPredProductId}
          onChange={(e) =>
            setSelectedPredProductId(e.target.value ? Number(e.target.value) : "")
          }
          disabled={loadingProducts}
        >
          <option value="">-- Select Product --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div className="mt-4">
          {loadingPred ? (
            <p className="text-zinc-400">Predicting...</p>
          ) : typeof predData?.predicted_next_price === "number" ? (
            <div>
              <p className="text-sm text-zinc-400">Next Price</p>
              <p className="text-xl font-bold text-cyan-300">
                ₹ {predData.predicted_next_price.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Current: ₹ {predData.current_price ?? "N/A"}
              </p>
            </div>
          ) : (
            <p className="text-zinc-500">
              Prediction unavailable for this product.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
