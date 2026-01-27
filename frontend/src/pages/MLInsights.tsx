import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";

type Product = {
  id: number;
  name: string;
  price?: number;
  sku?: string;
};

type CustomerSegment = {
  customer_id: number;
  name: string;
  phone?: string;
  total_spent: number;
  total_invoices: number;
  segment: number;
};

type RecommendationItem = {
  product_id: number;
  name: string;
  sku?: string;
  score: number;
};

type RecommendationResponse = {
  for_product: {
    id: number;
    name: string;
    sku?: string;
  };
  recommendations: RecommendationItem[];
};

type PredictPriceResponse = {
  product_id: number;
  product_name: string;
  current_price: number;
  predicted_next_price: number;
};

export default function MLInsights() {
  // products list for dropdowns
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // customer segments
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);

  // recommendations
  const [selectedRecProductId, setSelectedRecProductId] = useState<number | "">(
    ""
  );
  const [recData, setRecData] = useState<RecommendationResponse | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);

  // predict price
  const [selectedPredProductId, setSelectedPredProductId] = useState<
    number | ""
  >("");
  const [predData, setPredData] = useState<PredictPriceResponse | null>(null);
  const [loadingPred, setLoadingPred] = useState(false);

  // ---------------- FETCHERS ----------------

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get<Product[]>("/products/list");
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log(err);
      setProducts([]);
      alert("Failed to fetch products ❌");
    }
    setLoadingProducts(false);
  };

  const fetchCustomerSegments = async () => {
    setLoadingSegments(true);
    try {
      const res = await api.get<CustomerSegment[]>("/ml/customer-segments");
      setSegments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log(err);
      setSegments([]);
      alert("Failed to fetch customer segments ❌");
    }
    setLoadingSegments(false);
  };

  const fetchRecommendations = async (productId: number) => {
    setLoadingRec(true);
    try {
      const res = await api.get<RecommendationResponse>(
        `/ml/recommendations/${productId}`
      );
      setRecData(res.data ?? null);
    } catch (err) {
      console.log(err);
      setRecData(null);
      alert("Failed to fetch recommendations ❌");
    }
    setLoadingRec(false);
  };

  const fetchPredictedPrice = async (productId: number) => {
    setLoadingPred(true);
    try {
      const res = await api.get<PredictPriceResponse>(
        `/ml/predict-price/${productId}`
      );
      setPredData(res.data ?? null);
    } catch (err) {
      console.log(err);
      setPredData(null);
      alert("Failed to fetch predicted price ❌");
    }
    setLoadingPred(false);
  };

  // ---------------- EFFECTS ----------------

  useEffect(() => {
    (async () => {
      await fetchProducts();
      await fetchCustomerSegments();
    })();
  }, []);

  useEffect(() => {
    if (!selectedRecProductId) {
      return;
    }
    (async () => {
      await fetchRecommendations(Number(selectedRecProductId));
    })();
  }, [selectedRecProductId]);

  useEffect(() => {
    if (!selectedPredProductId) {
      return;
    }
    (async () => {
      await fetchPredictedPrice(Number(selectedPredProductId));
    })();
  }, [selectedPredProductId]);

  // ---------------- HELPERS ----------------

  const segmentLabel = (segment: number) => {
    if (segment === 1) return "VIP / High Value";
    if (segment === 0) return "Low Value";
    return `Segment ${segment}`;
  };

  // ---------------- UI ----------------

  return (
    <Layout title="ML Insights">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: CUSTOMER SEGMENTS */}
        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Customer Segments</h2>

            <button
              onClick={fetchCustomerSegments}
              disabled={loadingSegments}
              className={`px-3 py-1 rounded-lg text-sm transition ${
                loadingSegments
                  ? "bg-zinc-800 cursor-not-allowed"
                  : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              {loadingSegments ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loadingSegments ? (
            <p className="text-zinc-400 mt-4">Loading segments...</p>
          ) : segments.length === 0 ? (
            <p className="text-zinc-500 mt-4">No segment data found.</p>
          ) : (
            <div className="mt-4 overflow-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-800">
                    <th className="text-left py-2">Customer</th>
                    <th className="text-left py-2">Phone</th>
                    <th className="text-left py-2">Spent</th>
                    <th className="text-left py-2">Invoices</th>
                    <th className="text-left py-2">Segment</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((c) => (
                    <tr
                      key={c.customer_id}
                      className="border-b border-zinc-800"
                    >
                      <td className="py-2">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-zinc-500">
                          ID: {c.customer_id}
                        </div>
                      </td>
                      <td className="py-2 text-zinc-300">{c.phone ?? "-"}</td>
                      <td className="py-2">₹ {c.total_spent}</td>
                      <td className="py-2">{c.total_invoices}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs border ${
                            c.segment === 1
                              ? "bg-green-500/10 border-green-500/30 text-green-300"
                              : "bg-zinc-800 border-zinc-700 text-zinc-300"
                          }`}
                        >
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

        {/* MIDDLE: RECOMMENDATIONS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Recommendations</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Select a product to get suggested items.
          </p>

          <label className="text-sm text-zinc-400 mt-4 block">
            Select Product
          </label>

          <select
            className="w-full mt-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
            value={selectedRecProductId}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : "";
              setSelectedRecProductId(v);
            }}
            disabled={loadingProducts}
          >
            <option value="">-- Select Product --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 min-h-55">
            {!selectedRecProductId ? (
              <p className="text-zinc-500 text-sm">
                Pick a product to view recommendations.
              </p>
            ) : loadingRec ? (
              <p className="text-zinc-400 text-sm">Loading recommendations...</p>
            ) : !recData ? (
              <p className="text-zinc-500 text-sm">No recommendations found.</p>
            ) : recData.recommendations.length === 0 ? (
              <p className="text-zinc-500 text-sm">
                No recommendations returned by backend.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-zinc-300">
                  For:{" "}
                  <span className="font-semibold">
                    {recData.for_product.name}
                  </span>
                </div>

                <div className="space-y-2">
                  {recData.recommendations.map((r) => (
                    <div
                      key={r.product_id}
                      className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-zinc-500">
                            ID: {r.product_id} {r.sku ? `• SKU: ${r.sku}` : ""}
                          </p>
                        </div>

                        <div className="text-xs px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                          Score: {r.score}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: PREDICT PRICE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Predict Next Price</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Select a product to see predicted next price.
          </p>

          <label className="text-sm text-zinc-400 mt-4 block">
            Select Product
          </label>

          <select
            className="w-full mt-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
            value={selectedPredProductId}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : "";
              setSelectedPredProductId(v);
            }}
            disabled={loadingProducts}
          >
            <option value="">-- Select Product --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 min-h-55">
            {!selectedPredProductId ? (
              <p className="text-zinc-500 text-sm">
                Pick a product to view prediction.
              </p>
            ) : loadingPred ? (
              <p className="text-zinc-400 text-sm">Predicting price...</p>
            ) : !predData ? (
              <p className="text-zinc-500 text-sm">No prediction found.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-400">Product</p>
                  <p className="font-semibold">{predData.product_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
                    <p className="text-xs text-zinc-400">Current Price</p>
                    <p className="text-xl font-bold">
                      ₹ {predData.current_price}
                    </p>
                  </div>

                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4">
                    <p className="text-xs text-indigo-300">
                      Predicted Next Price
                    </p>
                    <p className="text-xl font-bold text-indigo-200">
                      ₹ {Number(predData.predicted_next_price).toFixed(2)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-zinc-500">
                  Note: Prediction is based on your ML model output.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
