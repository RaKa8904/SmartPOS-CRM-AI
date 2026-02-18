import { useEffect, useState } from "react";
import { api } from "../api";

type Customer = {
  id: number;
  name: string;
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

type InvoiceItem = {
  name: string;
  quantity: number;
  price: number;
  line_total: number;
};

type InvoiceResponse = {
  invoice_id: number;
  customer_name: string;
  items: InvoiceItem[];
  total_amount: number;
  message: string;
};

export default function Billing() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [invoiceData, setInvoiceData] = useState<InvoiceResponse | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [c, p] = await Promise.all([
          api.get<Customer[]>("/customers/list"),
          api.get<Product[]>("/products/list"),
        ]);
        setCustomers(c.data);
        setProducts(p.data);
      } catch (err) {
        console.error(err);
        alert("Failed to load billing data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toString().includes(searchTerm)
  );

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const found = prev.find((x) => x.product_id === p.id);
      if (found) {
        return prev.map((x) =>
          x.product_id === p.id ? { ...x, qty: x.qty + 1 } : x
        );
      }
      return [...prev, { product_id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const increaseQty = (product_id: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product_id === product_id
          ? { ...item, qty: item.qty + 1 }
          : item
      )
    );
  };

  const decreaseQty = (product_id: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product_id === product_id
            ? { ...item, qty: item.qty - 1 }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const removeItem = (product_id: number) => {
    setCart((prev) =>
      prev.filter((item) => item.product_id !== product_id)
    );
  };

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const createInvoice = async () => {
    if (!customerId || cart.length === 0) {
      alert("Select customer and add items.");
      return;
    }

    try {
      const res = await api.post<InvoiceResponse>("/billing/create", {
        customer_id: customerId,
        items: cart.map((c) => ({
          product_id: c.product_id,
          quantity: c.qty,
        })),
      });

      setInvoiceData(res.data);
      setCart([]);
    } catch (err) {
      console.error(err);
      alert("Failed to create invoice ❌");
    }
  };

  if (loading) return <p className="text-zinc-400">Loading...</p>;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL */}
        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
          <select
            className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
            value={customerId}
            onChange={(e) =>
              setCustomerId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">Select Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="mt-4 space-y-3">
            {cart.map((i) => (
              <div
                key={i.product_id}
                className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-zinc-400">
                    ₹ {i.price} × {i.qty}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => decreaseQty(i.product_id)} className="px-2 py-1 bg-zinc-800 rounded text-xs">−</button>
                  <span className="text-sm w-5 text-center">{i.qty}</span>
                  <button onClick={() => increaseQty(i.product_id)} className="px-2 py-1 bg-zinc-800 rounded text-xs">+</button>
                  <button onClick={() => removeItem(i.product_id)} className="px-2 py-1 bg-red-600 rounded text-xs">✕</button>
                </div>

                <div className="text-sm font-medium">
                  ₹ {i.price * i.qty}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-lg font-bold">
            Total: ₹ {total}
          </div>

          <button
            onClick={createInvoice}
            disabled={!customerId || cart.length === 0}
            className={`w-full mt-4 py-2 rounded-lg font-medium transition ${
              !customerId || cart.length === 0
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            Generate Invoice
          </button>
        </div>

        {/* PRODUCTS SECTION */}
        <div className="lg:col-span-2 overflow-auto">
          {/* SEARCH BAR */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by Product Name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
            />
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">SKU</th>
                <th className="text-right py-2 px-3">Price</th>
                <th className="text-center py-2 px-3">Stock</th>
                <th className="text-center py-2 px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-zinc-500">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-800 hover:bg-zinc-900/40">
                    <td className="py-2 px-3">{p.id}</td>
                    <td className="py-2 px-3">{p.name}</td>
                    <td className="py-2 px-3 text-zinc-400">{p.sku}</td>
                    <td className="py-2 px-3 text-right">₹ {p.price}</td>
                    <td className="py-2 px-3 text-center">{p.stock}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        disabled={p.stock <= 0}
                        onClick={() => addToCart(p)}
                        className={`px-3 py-1 rounded-lg text-xs ${
                          p.stock <= 0
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INVOICE MODAL */}
      {invoiceData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl">
            <h2 className="text-xl font-semibold text-indigo-400 mb-2">
              Invoice #{invoiceData.invoice_id}
            </h2>

            <p className="text-zinc-400 mb-4">
              Customer: <span className="text-white">{invoiceData.customer_name}</span>
            </p>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-700 text-zinc-400">
                  <th className="text-left py-2">Product</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((item, index) => (
                  <tr key={index} className="border-b border-zinc-800">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">₹ {item.price}</td>
                    <td className="py-2 text-right">₹ {item.line_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 text-right text-lg font-bold">
              Total: ₹ {invoiceData.total_amount}
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={() => setInvoiceData(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
