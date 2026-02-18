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
      } catch (error) {
        console.error("Failed to load billing data:", error);
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

  const increaseQty = (id: number) =>
    setCart((prev) =>
      prev.map((i) =>
        i.product_id === id ? { ...i, qty: i.qty + 1 } : i
      )
    );

  const decreaseQty = (id: number) =>
    setCart((prev) =>
      prev
        .map((i) =>
          i.product_id === id ? { ...i, qty: i.qty - 1 } : i
        )
        .filter((i) => i.qty > 0)
    );

  const removeItem = (id: number) =>
    setCart((prev) => prev.filter((i) => i.product_id !== id));

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
    } catch {
      alert("Failed to create invoice ❌");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <p className="text-zinc-400">Loading...</p>;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT PANEL */}
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 space-y-4">
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

          {/* CART LIST */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {cart.length === 0 && (
              <p className="text-zinc-500 text-sm text-center">
                No items added yet
              </p>
            )}

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

          <div className="text-lg font-bold text-indigo-400">
            Total: ₹ {total}
          </div>

          <button
            onClick={createInvoice}
            disabled={!customerId || cart.length === 0}
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500"
          >
            Generate Invoice
          </button>
        </div>

        {/* PRODUCTS */}
        <div className="lg:col-span-2 bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
          <input
            type="text"
            placeholder="Search by Product Name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full mb-4 p-2 rounded-lg bg-zinc-950 border border-zinc-800"
          />

          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="py-2 text-left">ID</th>
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-center">Stock</th>
                <th className="py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id} className="border-b border-zinc-800">
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td className="text-right">₹ {p.price}</td>
                  <td className="text-center">{p.stock}</td>
                  <td className="text-center">
                    <button
                      onClick={() => addToCart(p)}
                      className="px-3 py-1 bg-indigo-600 rounded text-xs"
                    >
                      Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INVOICE MODAL */}
      {invoiceData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 print:bg-white">
          <div className="bg-zinc-900 print:bg-white print:text-black border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl">

            <h2 className="text-xl font-semibold mb-2">
              Invoice #{invoiceData.invoice_id}
            </h2>

            <p className="mb-4">
              Customer: {invoiceData.customer_name}
            </p>

            {/* ITEM LIST RESTORED */}
            <table className="w-full text-sm border-collapse mb-4">
              <thead>
                <tr className="border-b border-zinc-700 print:border-black">
                  <th className="text-left py-2">Product</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((item, index) => (
                  <tr key={index} className="border-b border-zinc-800 print:border-black">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">₹ {item.price}</td>
                    <td className="py-2 text-right">₹ {item.line_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right text-lg font-bold mb-6">
              Total: ₹ {invoiceData.total_amount}
            </div>

            <div className="flex justify-end gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-green-600 rounded"
              >
                Print
              </button>
              <button
                onClick={() => setInvoiceData(null)}
                className="px-4 py-2 bg-indigo-600 rounded"
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
