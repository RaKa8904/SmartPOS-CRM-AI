import { useEffect, useState } from "react";
import { api } from "../api";

type Product = {
  id: number;
  name: string;
  price: number;
};

type EligibleCustomer = {
  customer_id: number;
  customer_name: string;
  phone?: string;
  email?: string;
  invoice_id: number;
  old_price: number;
  current_price: number;
  difference: number;
};

type PriceDropResponse = {
  product_id: number;
  product_name: string;
  current_price: number;
  eligible_customers: EligibleCustomer[];
  count: number;
};

export default function Notifications() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] =
    useState<number | "">("");
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [dropData, setDropData] =
    useState<PriceDropResponse | null>(null);
  const [loadingDropData, setLoadingDropData] = useState(false);

  const [sending, setSending] = useState(false);

  // ---------------- FETCHERS ----------------

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>("/products/list");
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch products ❌");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchPriceDrops = async (productId: number) => {
    setLoadingDropData(true);
    try {
      const res = await api.get<PriceDropResponse>(
        `/price-drops/product/${productId}`
      );
      setDropData(res.data ?? null);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch eligible customers ❌");
      setDropData(null);
    } finally {
      setLoadingDropData(false);
    }
  };

  const sendNotifications = async () => {
    if (!selectedProductId) {
      alert("Select a product first!");
      return;
    }

    setSending(true);
    try {
      const productId = Number(selectedProductId);

      await api.post(
        `/notifications/generate/product/${productId}`
      );

      const sendRes = await api.post(
        "/notifications/send/pending"
      );

      if (
        typeof sendRes.data?.message === "string" &&
        sendRes.data.message
          .toLowerCase()
          .includes("no pending")
      ) {
        alert("No pending notifications to send 📭");
      } else {
        alert("Notifications sent successfully ✅");
      }

      await fetchPriceDrops(productId);
    } catch (err) {
      console.error(err);
      alert("Failed to send notifications ❌");
    } finally {
      setSending(false);
    }
  };

  // ---------------- EFFECTS ----------------

  useEffect(() => {
    const load = async () => {
      await fetchProducts();
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!selectedProductId) {
        setDropData(null);
        return;
      }
      await fetchPriceDrops(Number(selectedProductId));
    };
    load();
  }, [selectedProductId]);

  // ---------------- UI ----------------

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-lg font-semibold mb-4">
          Send Notifications
        </h2>

        <label className="text-sm text-zinc-400">
          Select Product
        </label>

        <select
          className="w-full mt-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
          value={selectedProductId}
          onChange={(e) => {
            const value = e.target.value
              ? Number(e.target.value)
              : "";
            setSelectedProductId(value);
          }}
          disabled={loadingProducts}
        >
          <option value="">-- Select Product --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (₹{p.price})
            </option>
          ))}
        </select>

        <button
          onClick={sendNotifications}
          disabled={sending || !selectedProductId}
          className={`w-full mt-4 py-2 rounded-lg font-medium transition text-white ${
            sending || !selectedProductId
              ? "bg-zinc-800 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-500"
          }`}
        >
          {sending
            ? "Sending..."
            : "Generate + Send Notifications"}
        </button>

        <p className="text-xs text-zinc-500 mt-3">
          Generates notifications for the selected product and
          sends all pending emails.
        </p>
      </div>

      {/* RIGHT */}
      <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Eligible Customers
          </h2>

          <button
            className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
            disabled={!selectedProductId || loadingDropData}
            onClick={() => {
              if (selectedProductId)
                fetchPriceDrops(Number(selectedProductId));
            }}
          >
            Refresh
          </button>
        </div>

        {!selectedProductId ? (
          <p className="text-zinc-500 mt-4">
            Select a product to view eligible customers.
          </p>
        ) : loadingDropData ? (
          <p className="text-zinc-400 mt-4">
            Loading eligible customers...
          </p>
        ) : !dropData ? (
          <p className="text-zinc-500 mt-4">
            No data found.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-sm text-zinc-400">
                  Product
                </p>
                <p className="font-semibold">
                  {dropData.product_name}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-sm text-zinc-400">
                  Current Price
                </p>
                <p className="text-xl font-bold">
                  ₹ {dropData.current_price}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-sm text-zinc-400">
                  Count
                </p>
                <p className="text-xl font-bold">
                  {dropData.count}
                </p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 overflow-auto">
              {dropData.eligible_customers.length === 0 ? (
                <p className="text-zinc-500 text-sm">
                  No eligible customers.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-400 border-b border-zinc-800">
                      <th className="text-left py-2">
                        Customer
                      </th>
                      <th className="text-left py-2">
                        Email
                      </th>
                      <th className="text-left py-2">
                        Old
                      </th>
                      <th className="text-left py-2">
                        New
                      </th>
                      <th className="text-left py-2">
                        Diff
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dropData.eligible_customers.map(
                      (c) => (
                        <tr
                          key={`${c.customer_id}-${c.invoice_id}`}
                          className="border-b border-zinc-800"
                        >
                          <td className="py-2">
                            <div className="font-medium">
                              {c.customer_name}
                            </div>
                            <div className="text-xs text-zinc-500">
                              Invoice: {c.invoice_id}
                            </div>
                          </td>
                          <td className="py-2">
                            {c.email ?? "-"}
                          </td>
                          <td className="py-2">
                            ₹ {c.old_price}
                          </td>
                          <td className="py-2">
                            ₹ {c.current_price}
                          </td>
                          <td className="py-2 text-green-400">
                            ₹ {c.difference}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
