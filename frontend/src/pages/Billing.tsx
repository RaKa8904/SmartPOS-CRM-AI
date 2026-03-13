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
  tax_rate: number;
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
  line_tax: number;
};

type InvoiceResponse = {
  invoice_id: number;
  customer_name: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  change_due: number | null;
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
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountTendered, setAmountTendered] = useState<number | "">("");

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

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const estimatedTax = cart.reduce((s, i) => {
    const product = products.find((p) => p.id === i.product_id);
    const rate = product?.tax_rate ?? 0;
    return s + (i.price * i.qty * rate) / 100;
  }, 0);
  const estimatedGrandTotal = subtotal + estimatedTax;

  const estimatedChange =
    paymentMethod === "cash" && amountTendered !== ""
      ? Number(amountTendered) - estimatedGrandTotal
      : null;

  const createInvoice = async () => {
    if (!customerId || cart.length === 0) {
      alert("Select customer and add items.");
      return;
    }

    if (paymentMethod === "cash") {
      if (amountTendered === "") {
        alert("Enter amount tendered for cash payment.");
        return;
      }

      if (Number(amountTendered) < estimatedGrandTotal) {
        alert(
          `Amount tendered (Rs ${Number(amountTendered).toFixed(2)}) is less than payable total (Rs ${estimatedGrandTotal.toFixed(2)}).`
        );
        return;
      }
    }

    try {
      const res = await api.post<InvoiceResponse>("/billing/create", {
        customer_id: customerId,
        items: cart.map((c) => ({
          product_id: c.product_id,
          quantity: c.qty,
        })),
        payment_method: paymentMethod,
        amount_tendered:
          paymentMethod === "cash" && amountTendered !== ""
            ? Number(amountTendered)
            : undefined,
      });

      setInvoiceData(res.data);
      setCart([]);
      setAmountTendered("");
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      alert(detail ? `Failed to create invoice: ${detail}` : "Failed to create invoice");
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
        <div className="glass-card p-6 rounded-2xl space-y-4 fade-in">
          <select
            className="input-surface"
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
                className="flex items-center justify-between bg-[#0b1635]/80 p-3 rounded-lg border border-[#33437f]/40"
              >
                <div>
                  <p className="text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-zinc-400">
                    ₹ {i.price} × {i.qty}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => decreaseQty(i.product_id)} className="px-2 py-1 bg-slate-700/70 rounded text-xs">−</button>
                  <span className="text-sm w-5 text-center">{i.qty}</span>
                  <button onClick={() => increaseQty(i.product_id)} className="px-2 py-1 bg-slate-700/70 rounded text-xs">+</button>
                  <button onClick={() => removeItem(i.product_id)} className="px-2 py-1 bg-rose-600/80 rounded text-xs">✕</button>
                </div>

                <div className="text-sm font-medium">
                  ₹ {i.price * i.qty}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#0b1635]/80 border border-[#33437f]/40 rounded-lg p-3 text-sm space-y-1">
            <p className="text-zinc-400">Subtotal: Rs {subtotal.toFixed(2)}</p>
            <p className="text-zinc-400">Estimated GST: Rs {estimatedTax.toFixed(2)}</p>
            <p className="text-cyan-300 font-bold">Payable Total: Rs {estimatedGrandTotal.toFixed(2)}</p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <select
              className="input-surface"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                if (e.target.value !== "cash") {
                  setAmountTendered("");
                }
              }}
            >
              <option value="cash">💵 Cash</option>
              <option value="card">💳 Card</option>
              <option value="upi">📱 UPI</option>
              <option value="credit">🏦 Credit</option>
            </select>

            {paymentMethod === "cash" && (
              <input
                type="number"
                placeholder="Amount tendered (Rs)"
                value={amountTendered}
                onChange={(e) =>
                  setAmountTendered(e.target.value ? Number(e.target.value) : "")
                }
                className="input-surface"
              />
            )}

            {paymentMethod === "cash" && estimatedChange !== null && (
              <p
                className={`text-xs ${
                  estimatedChange >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {estimatedChange >= 0
                  ? `Estimated change: Rs ${estimatedChange.toFixed(2)}`
                  : `Short by: Rs ${Math.abs(estimatedChange).toFixed(2)}`}
              </p>
            )}
          </div>

          <button
            onClick={createInvoice}
            disabled={!customerId || cart.length === 0}
            className="btn-primary w-full py-2"
          >
            Generate Invoice
          </button>
        </div>

        {/* PRODUCTS */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl fade-in stagger-1">
          <input
            type="text"
            placeholder="Search by Product Name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-surface mb-4"
          />

          <div className="rounded-xl border border-[#33437f]/35 overflow-hidden bg-[#0d1635]/55">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-200/90 bg-[#18275a]/70 border-b border-[#33437f]/45">
                  <th className="py-3 px-3 text-left">ID</th>
                  <th className="py-3 px-3 text-left">Product</th>
                  <th className="py-3 px-3 text-right">Price</th>
                  <th className="py-3 px-3 text-center">Stock</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25 hover:bg-[#1f3370]/30 transition">
                    <td className="px-3 py-2.5 text-slate-300">{p.id}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-100">{p.name}</td>
                    <td className="px-3 py-2.5 text-right text-cyan-200">₹ {p.price}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.stock <= 10
                            ? "bg-rose-500/20 text-rose-200"
                            : "bg-emerald-500/20 text-emerald-200"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => addToCart(p)}
                        className="btn-primary px-3 py-1 text-xs"
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
      </div>

      {/* INVOICE MODAL */}
      {invoiceData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 print:bg-white">
          <div className="glass-card print:bg-white print:text-black border border-[#33437f]/35 rounded-2xl p-6 w-full max-w-2xl">

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

            {/* GST Breakdown */}
            <div className="text-right text-sm text-zinc-400 space-y-1 mb-3">
              <p>Subtotal: ₹ {invoiceData.subtotal?.toFixed(2)}</p>
              <p>GST: ₹ {invoiceData.tax_amount?.toFixed(2)}</p>
              <p className="text-lg font-bold text-white">
                Grand Total: ₹ {invoiceData.total_amount?.toFixed(2)}
              </p>
              <p className="capitalize text-zinc-400">
                Payment: {invoiceData.payment_method}
              </p>
              {invoiceData.change_due != null && invoiceData.change_due > 0 && (
                <p className="text-green-400 font-semibold">
                  Change Due: ₹ {invoiceData.change_due.toFixed(2)}
                </p>
              )}
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
