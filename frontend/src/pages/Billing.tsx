import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";

type Customer = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
};

type CartItem = {
  product_id: number;
  name: string;
  price: number;
  qty: number;
};

// ✅ invoice response can be anything OR null
type InvoiceResult = Record<string, unknown> | null;

export default function Billing() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // selected customer
  const [customerId, setCustomerId] = useState<number | "">("");

  // cart
  const [cart, setCart] = useState<CartItem[]>([]);

  const [invoiceResult, setInvoiceResult] = useState<InvoiceResult>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, prodRes] = await Promise.all([
        api.get<Customer[]>("/customers/list"),
        api.get<Product[]>("/products/list"),
      ]);

      setCustomers(custRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      alert("Error fetching customers/products. Check backend running.");
      console.log(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, []);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const exists = prev.find((x) => x.product_id === p.id);
      if (exists) {
        return prev.map((x) =>
          x.product_id === p.id ? { ...x, qty: x.qty + 1 } : x
        );
      }
      return [
        ...prev,
        { product_id: p.id, name: p.name, price: p.price, qty: 1 },
      ];
    });
  };

  const updateQty = (product_id: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((x) => x.product_id !== product_id));
      return;
    }
    setCart((prev) =>
      prev.map((x) => (x.product_id === product_id ? { ...x, qty } : x))
    );
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  };

  const createInvoice = async () => {
    if (!customerId) {
      alert("Please select a customer first!");
      return;
    }
    if (cart.length === 0) {
      alert("Cart is empty! Add products.");
      return;
    }

    try {
      const payload = {
        customer_id: customerId,
        items: cart.map((c) => ({
          product_id: c.product_id,
          quantity: c.qty,
        })),
      };

      const res = await api.post("/billing/create", payload);
      setInvoiceResult(res.data as Record<string, unknown>);

      alert("Invoice created successfully ✅");

      // refresh product stock + reset cart
      setCart([]);
      await fetchData();
    } catch (err) {
      console.log(err);
      alert("Invoice creation failed ❌ Check backend logs.");
    }
  };

  return (
    <Layout title="Billing">
      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: CUSTOMER + CART */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-lg font-semibold mb-4">Create Invoice</h2>

            {/* Customer dropdown */}
            <label className="text-sm text-zinc-400">Select Customer</label>
            <select
              className="w-full mt-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
              value={customerId}
              onChange={(e) =>
                setCustomerId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (ID: {c.id})
                </option>
              ))}
            </select>

            {/* Cart */}
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Cart</h3>

              {cart.length === 0 ? (
                <p className="text-zinc-500 text-sm">No items added yet.</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.product_id}
                      className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-zinc-400">
                          ₹ {item.price} each
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                          onClick={() =>
                            updateQty(item.product_id, item.qty - 1)
                          }
                        >
                          -
                        </button>
                        <span className="w-6 text-center">{item.qty}</span>
                        <button
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                          onClick={() =>
                            updateQty(item.product_id, item.qty + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              <div className="mt-5 border-t border-zinc-800 pt-4">
                <p className="text-sm text-zinc-400">Total</p>
                <p className="text-xl font-bold">₹ {getTotal()}</p>
              </div>

              {/* Create Invoice Button */}
              <button
                onClick={createInvoice}
                className="w-full mt-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition text-white font-medium"
              >
                Generate Invoice
              </button>
            </div>

            {/* Invoice result */}
            {invoiceResult && (
              <div className="mt-6 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                <p className="text-sm font-semibold">Invoice Created ✅</p>
                <pre className="text-xs text-zinc-400 mt-2 overflow-auto">
                  {JSON.stringify(invoiceResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* RIGHT: PRODUCTS LIST */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Products</h2>

            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-800">
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">SKU</th>
                    <th className="text-left py-2">Price</th>
                    <th className="text-left py-2">Stock</th>
                    <th className="text-left py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-800">
                      <td className="py-2">{p.name}</td>
                      <td className="py-2">{p.sku}</td>
                      <td className="py-2">₹ {p.price}</td>
                      <td className="py-2">{p.stock}</td>
                      <td className="py-2">
                        <button
                          disabled={p.stock <= 0}
                          onClick={() => addToCart(p)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                            p.stock <= 0
                              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white"
                          }`}
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {products.length === 0 && (
                <p className="text-zinc-500 mt-4">No products found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
