import { useEffect, useState } from "react";
import { api } from "../api";

type Product = {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
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

export default function Pricing() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [selectedProductId, setSelectedProductId] =
    useState<number | "">("");
  const [newPrice, setNewPrice] = useState<number>(0);

  const [dropsLoading, setDropsLoading] = useState(false);
  const [dropsData, setDropsData] =
    useState<PriceDropResponse | null>(null);

  // ---------------- FETCHERS ----------------

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>("/products/list");
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch products.");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchPriceDrops = async (productId: number) => {
    setDropsLoading(true);
    try {
      const res = await api.get<PriceDropResponse>(
        `/price-drops/product/${productId}`
      );
      setDropsData(res.data ?? null);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch price drops.");
      setDropsData(null);
    } finally {
      setDropsLoading(false);
    }
  };

  const updatePrice = async () => {
    if (!selectedProductId) {
      alert("Select a product first.");
      return;
    }
    if (newPrice <= 0) {
      alert("Enter a valid new price.");
      return;
    }

    try {
      await api.post("/pricing/update", {
        product_id: selectedProductId,
        new_price: newPrice,
      });

      alert("Price updated successfully ✅");

      await fetchProducts();
      await fetchPriceDrops(Number(selectedProductId));
    } catch (err) {
      console.error(err);
      alert("Price update failed ❌");
    }
  };

  // ---------------- EFFECT ----------------

  useEffect(() => {
    const load = async () => {
      await fetchProducts();
    };
    load();
  }, []);

  // ---------------- UI ----------------

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-lg font-semibold mb-4">
          Update Product Price
        </h2>

        {loadingProducts ? (
          <p className="text-zinc-400">Loading products...</p>
        ) : (
          <>
            <label className="text-sm text-zinc-400">
              Select Product
            </label>

            <select
              className="w-full mt-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
              value={selectedProductId}
              onChange={(e) => {
                const val = e.target.value
                  ? Number(e.target.value)
                  : "";
                setSelectedProductId(val);
                if (val) fetchPriceDrops(val);
              }}
            >
              <option value="">-- Select Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₹{p.price})
                </option>
              ))}
            </select>

            <label className="text-sm text-zinc-400 mt-4 block">
              New Price
            </label>

            <input
              type="number"
              className="w-full mt-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
              value={newPrice}
              onChange={(e) =>
                setNewPrice(Number(e.target.value))
              }
            />

            <button
              onClick={updatePrice}
              className="w-full mt-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition text-white font-medium"
            >
              Update Price
            </button>
          </>
        )}
      </div>

      {/* RIGHT */}
      <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Detected Price Drops
          </h2>

          <button
            className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
            onClick={() => {
              if (selectedProductId)
                fetchPriceDrops(Number(selectedProductId));
            }}
          >
            Refresh
          </button>
        </div>

        {!selectedProductId ? (
          <p className="text-zinc-400 mt-3">
            Select a product to view price drops.
          </p>
        ) : dropsLoading ? (
          <p className="text-zinc-400 mt-3">Loading drops...</p>
        ) : !dropsData ? (
          <p className="text-zinc-400 mt-3">
            No drop data found.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-sm text-zinc-400">
                  Product
                </p>
                <p className="font-semibold">
                  {dropsData.product_name}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-sm text-zinc-400">
                  Current Price
                </p>
                <p className="text-xl font-bold">
                  ₹ {dropsData.current_price}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="text-sm text-zinc-400">
                  Eligible Customers
                </p>
                <p className="text-xl font-bold">
                  {dropsData.count}
                </p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 overflow-auto">
              <h3 className="font-semibold mb-3">
                Eligible Customers
              </h3>

              {dropsData.eligible_customers.length === 0 ? (
                <p className="text-zinc-500 text-sm">
                  No eligible customers found.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-400 border-b border-zinc-800">
                      <th className="text-left py-2">
                        Customer
                      </th>
                      <th className="text-left py-2">
                        Invoice
                      </th>
                      <th className="text-left py-2">
                        Old Price
                      </th>
                      <th className="text-left py-2">
                        New Price
                      </th>
                      <th className="text-left py-2">
                        Difference
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dropsData.eligible_customers.map(
                      (c, idx) => (
                        <tr
                          key={`${c.invoice_id}-${idx}`}
                          className="border-b border-zinc-800"
                        >
                          <td className="py-2">
                            <div className="font-medium">
                              {c.customer_name}
                            </div>
                            <div className="text-xs text-zinc-500">
                              ID: {c.customer_id}
                            </div>
                          </td>
                          <td className="py-2">
                            {c.invoice_id}
                          </td>
                          <td className="py-2">
                            ₹ {c.old_price}
                          </td>
                          <td className="py-2">
                            ₹ {c.current_price}
                          </td>
                          <td className="py-2 font-semibold text-emerald-400">
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
