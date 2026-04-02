import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
import { printInvoiceDocument } from "../utils/invoicePrint";

/* ─── Types ────────────────────────────────────────────────── */
type Category = { id: number; name: string };

type Product = {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  tax_rate: number;
  category_id: number | null;
};

type CartItem = {
  product_id: number;
  name: string;
  price: number;
  qty: number;
  tax_rate: number;
};

type Customer = { id: number; name: string };

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

type SortKey = "name" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

/* ─── Icon helpers ─────────────────────────────────────────── */
function SvgIcon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function Billing() {
  /* ── data state ── */
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── billing state ── */
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountTendered, setAmountTendered] = useState<number | "">("");
  const [invoiceData, setInvoiceData] = useState<InvoiceResponse | null>(null);
  const [stockNotice, setStockNotice] = useState<string | null>(null);

  /* ── filter / view state ── */
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showOnlyInStock, setShowOnlyInStock] = useState(false);

  /* ── load data ── */
  useEffect(() => {
    const load = async () => {
      try {
        const [c, p, cats] = await Promise.all([
          api.get<Customer[]>("/customers/list"),
          api.get<Product[]>("/products/list"),
          api.get<Category[]>("/categories/list"),
        ]);
        setCustomers(c.data);
        setProducts(p.data);
        setCategories(cats.data);
      } catch (error) {
        console.error("Failed to load billing data:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ── category name map ── */
  const categoryMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const c of categories) m[c.id] = c.name;
    return m;
  }, [categories]);

  /* ── category product counts ── */
  const categoryCounts = useMemo(() => {
    const counts: Record<number | string, number> = { all: products.length };
    for (const p of products) {
      const key = p.category_id ?? "uncategorized";
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [products]);

  /* ── cart helpers ── */
  const getCartQty = (pid: number) => cart.find((i) => i.product_id === pid)?.qty ?? 0;
  const getLiveStock = (pid: number) => {
    const p = products.find((x) => x.id === pid);
    return p ? Math.max(p.stock - getCartQty(pid), 0) : 0;
  };

  const showStockNotice = (name: string) => setStockNotice(`Insufficient stock for '${name}'`);

  const addToCart = (p: Product) => {
    if (getLiveStock(p.id) <= 0) { showStockNotice(p.name); return; }
    setCart((prev) => {
      const found = prev.find((x) => x.product_id === p.id);
      if (found) return prev.map((x) => x.product_id === p.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { product_id: p.id, name: p.name, price: p.price, qty: 1, tax_rate: p.tax_rate }];
    });
  };

  const increaseQty = (id: number) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    if (getLiveStock(id) <= 0) { showStockNotice(p.name); return; }
    setCart((prev) => prev.map((i) => i.product_id === id ? { ...i, qty: i.qty + 1 } : i));
  };

  const decreaseQty = (id: number) =>
    setCart((prev) => prev.map((i) => i.product_id === id ? { ...i, qty: i.qty - 1 } : i).filter((i) => i.qty > 0));

  const removeItem = (id: number) => setCart((prev) => prev.filter((i) => i.product_id !== id));

  /* ── totals ── */
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const estimatedTax = cart.reduce((s, i) => s + (i.price * i.qty * i.tax_rate) / 100, 0);
  const estimatedGrandTotal = subtotal + estimatedTax;
  const estimatedChange = paymentMethod === "cash" && amountTendered !== "" ? Number(amountTendered) - estimatedGrandTotal : null;

  /* ── filtered + sorted products ── */
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Category filter
    if (activeCategory !== "all") {
      list = list.filter((p) => p.category_id === activeCategory);
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.id.toString().includes(q)
      );
    }

    // In-stock filter
    if (showOnlyInStock) {
      list = list.filter((p) => getLiveStock(p.id) > 0);
    }

    // Sorting
    switch (sortKey) {
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "stock-asc":
        list.sort((a, b) => getLiveStock(a.id) - getLiveStock(b.id));
        break;
      case "stock-desc":
        list.sort((a, b) => getLiveStock(b.id) - getLiveStock(a.id));
        break;
    }

    return list;
  }, [products, activeCategory, searchTerm, sortKey, showOnlyInStock, cart]);

  /* ── customer filter ── */
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const selectedCustomerName = useMemo(() => {
    if (customerId === "") return "";
    return customers.find((c) => c.id === customerId)?.name ?? "";
  }, [customerId, customers]);

  /* ── close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  /* ── create invoice ── */
  const createInvoice = async () => {
    if (!customerId || cart.length === 0) { alert("Select customer and add items."); return; }
    if (paymentMethod === "cash") {
      if (amountTendered === "") { alert("Enter amount tendered for cash payment."); return; }
      if (Number(amountTendered) < estimatedGrandTotal) {
        alert(`Amount tendered (₹${Number(amountTendered).toFixed(2)}) is less than payable total (₹${estimatedGrandTotal.toFixed(2)}).`);
        return;
      }
    }
    try {
      const res = await api.post<InvoiceResponse>("/billing/create", {
        customer_id: customerId,
        items: cart.map((c) => ({ product_id: c.product_id, quantity: c.qty })),
        payment_method: paymentMethod,
        amount_tendered: paymentMethod === "cash" && amountTendered !== "" ? Number(amountTendered) : undefined,
      });
      setInvoiceData(res.data);
      setProducts((prev) =>
        prev.map((p) => {
          const ci = cart.find((c) => c.product_id === p.id);
          return ci ? { ...p, stock: Math.max(p.stock - ci.qty, 0) } : p;
        })
      );
      setCart([]);
      setAmountTendered("");
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      alert(detail ? `Failed to create invoice: ${detail}` : "Failed to create invoice");
    }
  };

  /* ── keyboard / timer effects ── */
  useEffect(() => {
    if (!invoiceData) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setInvoiceData(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [invoiceData]);

  useEffect(() => {
    if (!stockNotice) return;
    const t = setTimeout(() => setStockNotice(null), 2500);
    return () => clearTimeout(t);
  }, [stockNotice]);

  /* ── stock badge ── */
  const stockBadge = (pid: number) => {
    const s = getLiveStock(pid);
    if (s <= 0) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/25 text-rose-300 border border-rose-400/20">OUT</span>;
    if (s <= 10) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/20">{s}</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">{s}</span>;
  };

  /* ── category icon colors ── */
  const catColors: Record<string, string> = {
    "Beverages": "from-cyan-500/30 to-cyan-600/10 border-cyan-400/25",
    "Snacks": "from-amber-500/30 to-amber-600/10 border-amber-400/25",
    "Dairy & Bakery": "from-yellow-500/30 to-yellow-600/10 border-yellow-400/25",
    "Instant Meals": "from-orange-500/30 to-orange-600/10 border-orange-400/25",
    "Personal Care": "from-pink-500/30 to-pink-600/10 border-pink-400/25",
    "Home & Cleaning": "from-teal-500/30 to-teal-600/10 border-teal-400/25",
    "Stationery": "from-indigo-500/30 to-indigo-600/10 border-indigo-400/25",
    "Frozen Foods": "from-blue-500/30 to-blue-600/10 border-blue-400/25",
    "Health & Wellness": "from-emerald-500/30 to-emerald-600/10 border-emerald-400/25",
    "Electronics Accessories": "from-violet-500/30 to-violet-600/10 border-violet-400/25",
    "Spices & Condiments": "from-red-500/30 to-red-600/10 border-red-400/25",
    "Baby & Kids": "from-fuchsia-500/30 to-fuchsia-600/10 border-fuchsia-400/25",
  };

  const catEmojis: Record<string, string> = {
    "Beverages": "🥤", "Snacks": "🍿", "Dairy & Bakery": "🧈",
    "Instant Meals": "🍜", "Personal Care": "🧴", "Home & Cleaning": "🧹",
    "Stationery": "📒", "Frozen Foods": "🧊", "Health & Wellness": "💊",
    "Electronics Accessories": "🔌", "Spices & Condiments": "🌶️", "Baby & Kids": "🍼",
  };

  /* ═══════════════════════════════════════════════════════════
   *  INVOICE MODAL
   * ═══════════════════════════════════════════════════════════ */
  const invoiceModal = invoiceData ? (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center print:bg-white p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) setInvoiceData(null); }}
    >
      <div className="glass-card print:bg-white print:text-black border border-[#33437f]/35 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Invoice #{invoiceData.invoice_id}</h2>
            <p className="text-sm text-slate-400">Customer: {invoiceData.customer_name}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 uppercase">{invoiceData.payment_method}</span>
        </div>

        <table className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="border-b border-zinc-700 print:border-black">
              <th className="text-left py-2 text-slate-400 font-medium">Product</th>
              <th className="text-center py-2 text-slate-400 font-medium">Qty</th>
              <th className="text-right py-2 text-slate-400 font-medium">Price</th>
              <th className="text-right py-2 text-slate-400 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map((item, index) => (
              <tr key={index} className="border-b border-zinc-800 print:border-black">
                <td className="py-2.5">{item.name}</td>
                <td className="py-2.5 text-center">{item.quantity}</td>
                <td className="py-2.5 text-right text-cyan-200">₹ {item.price}</td>
                <td className="py-2.5 text-right font-medium">₹ {item.line_total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-zinc-700 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>₹ {invoiceData.subtotal?.toFixed(2)}</span></div>
          <div className="flex justify-between text-slate-400"><span>GST</span><span>₹ {invoiceData.tax_amount?.toFixed(2)}</span></div>
          <div className="flex justify-between text-lg font-bold text-white pt-1"><span>Grand Total</span><span>₹ {invoiceData.total_amount?.toFixed(2)}</span></div>
          {invoiceData.change_due != null && invoiceData.change_due > 0 && (
            <div className="flex justify-between text-emerald-400 font-semibold"><span>Change Due</span><span>₹ {invoiceData.change_due.toFixed(2)}</span></div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-5 print:hidden">
          <button onClick={() => printInvoiceDocument(invoiceData)} className="px-5 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-medium transition">🖨 Print</button>
          <button onClick={() => setInvoiceData(null)} className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-medium transition">Close</button>
        </div>
      </div>
    </div>
  ) : null;

  /* ═══════════════════════════════════════════════════════════ */
  if (loading) return <p className="text-zinc-400">Loading billing…</p>;

  return (
    <>
      <div className="flex flex-col xl:flex-row gap-5 min-h-0">

        {/* ──────────────────────────────────────────────────────
         *  LEFT: CART & CHECKOUT (sticky on desktop)
         * ────────────────────────────────────────────────────── */}
        <div className="w-full xl:w-[380px] shrink-0 xl:sticky xl:top-4 xl:self-start space-y-4 fade-in">

          {/* Customer selector – custom searchable dropdown */}
          <div className="glass-card rounded-2xl p-4 relative z-10">
            <label className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold mb-2 block">Customer</label>
            <div className="relative" ref={customerDropdownRef}>
              <button
                type="button"
                onClick={() => { setCustomerDropdownOpen((v) => !v); setCustomerSearch(""); }}
                className="input-surface text-sm w-full text-left flex items-center justify-between gap-2"
              >
                <span className={selectedCustomerName ? "text-slate-100" : "text-slate-500"}>
                  {selectedCustomerName || "– Select Customer –"}
                </span>
                <svg viewBox="0 0 24 24" className={`h-4 w-4 text-slate-500 transition-transform ${customerDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </button>

              {customerDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-[#33437f]/50 bg-[#0b1130]/98 backdrop-blur-xl shadow-2xl overflow-hidden">
                  {/* Search inside dropdown */}
                  <div className="p-2 border-b border-white/5">
                      <input
                        type="text"
                        placeholder="Search customers…"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/8 rounded-lg text-xs text-slate-200 placeholder-slate-500 py-2 px-3 focus:outline-none focus:border-cyan-400/40"
                        autoFocus
                      />
                  </div>
                  {/* Options list */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No customers found</p>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setCustomerId(c.id); setCustomerDropdownOpen(false); setCustomerSearch(""); }}
                          className={`w-full text-left px-3 py-2 text-xs transition hover:bg-cyan-500/10 ${
                            customerId === c.id ? "bg-cyan-500/15 text-cyan-200 font-semibold" : "text-slate-300"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <SvgIcon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" className="text-cyan-400" />
                Cart
                {cart.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-500/25 text-cyan-300 font-bold">{cart.length}</span>
                )}
              </h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-[10px] text-rose-400 hover:text-rose-300 transition uppercase tracking-wider font-semibold">Clear all</button>
              )}
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {cart.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <SvgIcon d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18" className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Add products to start billing</p>
                </div>
              )}
              {cart.map((i) => (
                <div key={i.product_id} className="group flex items-center gap-3 bg-[#0b1635]/80 p-2.5 rounded-xl border border-[#33437f]/30 hover:border-cyan-400/20 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-100 truncate">{i.name}</p>
                    <p className="text-[11px] text-slate-500">₹{i.price} × {i.qty} = <span className="text-cyan-300 font-semibold">₹{(i.price * i.qty).toFixed(2)}</span></p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => decreaseQty(i.product_id)} className="h-6 w-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition">−</button>
                    <span className="text-xs w-6 text-center font-bold text-white">{i.qty}</span>
                    <button onClick={() => increaseQty(i.product_id)} className="h-6 w-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition">+</button>
                    <button onClick={() => removeItem(i.product_id)} className="h-6 w-6 flex items-center justify-center rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 text-xs transition ml-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Payment */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            {/* Bill summary */}
            <div className="bg-[#0b1635]/80 border border-[#33437f]/30 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400"><span>Subtotal</span><span>₹ {subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs text-slate-400"><span>Est. GST</span><span>₹ {estimatedTax.toFixed(2)}</span></div>
              <div className="border-t border-white/5 pt-1.5 flex justify-between text-sm font-bold">
                <span className="text-slate-200">Payable Total</span>
                <span className="text-cyan-300 text-base">₹ {estimatedGrandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method tabs */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold mb-1.5 block">Payment Method</label>
              <div className="grid grid-cols-4 gap-1.5">
                {([["cash", "💵", "Cash"], ["card", "💳", "Card"], ["upi", "📱", "UPI"], ["credit", "🏦", "Credit"]] as const).map(([val, emoji, label]) => (
                  <button
                    key={val}
                    onClick={() => { setPaymentMethod(val); if (val !== "cash") setAmountTendered(""); }}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                      paymentMethod === val
                        ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-200 shadow-[0_0_20px_rgba(0,245,255,0.08)]"
                        : "bg-white/5 border-white/8 text-slate-400 hover:bg-white/8 hover:text-slate-300"
                    }`}
                  >
                    <span className="block text-base mb-0.5">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash input */}
            {paymentMethod === "cash" && (
              <div>
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value ? Number(e.target.value) : "")}
                  className="input-surface text-sm"
                />
                {estimatedChange !== null && (
                  <p className={`text-xs mt-1 font-medium ${estimatedChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {estimatedChange >= 0 ? `Change: ₹ ${estimatedChange.toFixed(2)}` : `Short by: ₹ ${Math.abs(estimatedChange).toFixed(2)}`}
                  </p>
                )}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={createInvoice}
              disabled={!customerId || cart.length === 0}
              className="btn-primary w-full py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" className="text-white" />
              Generate Invoice
            </button>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────
         *  RIGHT: PRODUCT CATALOG
         * ────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4 fade-in stagger-1">

          {/* ── Search + Controls bar ── */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
                <input
                  type="text"
                  placeholder="Search by name, SKU, or ID…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-surface text-sm"
                />

              {/* Sort */}
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="input-surface max-w-48 text-sm"
              >
                <option value="name">Sort: Name A-Z</option>
                <option value="price-asc">Sort: Price Low → High</option>
                <option value="price-desc">Sort: Price High → Low</option>
                <option value="stock-asc">Sort: Stock Low → High</option>
                <option value="stock-desc">Sort: Stock High → Low</option>
              </select>

              {/* View toggle */}
              <div className="flex gap-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-2 rounded-xl border text-xs transition ${viewMode === "grid" ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-200" : "bg-white/5 border-white/8 text-slate-400 hover:text-slate-300"}`}
                  title="Grid view"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-2 rounded-xl border text-xs transition ${viewMode === "list" ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-200" : "bg-white/5 border-white/8 text-slate-400 hover:text-slate-300"}`}
                  title="List view"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                </button>

                {/* In-stock toggle */}
                <button
                  onClick={() => setShowOnlyInStock((v) => !v)}
                  className={`px-3 py-2 rounded-xl border text-[11px] font-semibold transition whitespace-nowrap ${
                    showOnlyInStock
                      ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                      : "bg-white/5 border-white/8 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  In Stock
                </button>
              </div>
            </div>
          </div>

          {/* ── Category pills ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                activeCategory === "all"
                  ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-200 shadow-[0_0_20px_rgba(0,245,255,0.1)]"
                  : "bg-white/5 border-white/8 text-slate-400 hover:bg-white/8 hover:text-slate-300"
              }`}
            >
              🏪 All <span className="ml-1 text-[10px] opacity-70">({categoryCounts.all || 0})</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  activeCategory === cat.id
                    ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-200 shadow-[0_0_20px_rgba(0,245,255,0.1)]"
                    : "bg-white/5 border-white/8 text-slate-400 hover:bg-white/8 hover:text-slate-300"
                }`}
              >
                {catEmojis[cat.name] || "📦"} {cat.name} <span className="ml-1 text-[10px] opacity-70">({categoryCounts[cat.id] || 0})</span>
              </button>
            ))}
          </div>

          {/* ── Results info ── */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-slate-500">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
              {activeCategory !== "all" && ` in ${categoryMap[activeCategory as number] || "category"}`}
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
          </div>

          {/* ── Product grid / list ── */}
          {filteredProducts.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-slate-500 text-sm">No products found matching your filters.</p>
            </div>
          ) : viewMode === "grid" ? (
            /* ─── GRID VIEW ─── */
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
              {filteredProducts.map((p) => {
                const catName = p.category_id ? categoryMap[p.category_id] : "Uncategorized";
                const isOut = getLiveStock(p.id) <= 0;
                const inCart = getCartQty(p.id) > 0;
                return (
                  <div
                    key={p.id}
                    className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden ${
                      inCart
                        ? "border-cyan-400/30 bg-cyan-500/5 shadow-[0_0_25px_rgba(0,245,255,0.06)]"
                        : isOut
                          ? "border-white/5 bg-[#0d1130]/60 opacity-60"
                          : "border-white/8 bg-[#0d1130]/80 hover:border-cyan-400/15 hover:bg-[#0d1130]/95"
                    }`}
                  >
                    {/* Category tag strip */}
                    <div className={`h-1 w-full bg-gradient-to-r ${catColors[catName || ""] || "from-slate-500/30 to-slate-600/10"}`} />

                    <div className="p-3.5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-slate-100 truncate">{p.name}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono">{p.sku}</span>
                            <span>·</span>
                            <span>{catEmojis[catName || ""] || "📦"} {catName}</span>
                          </p>
                        </div>
                        {stockBadge(p.id)}
                      </div>

                      <div className="flex items-end justify-between mt-3">
                        <div>
                          <p className="text-lg font-bold text-cyan-300">₹{p.price}</p>
                          <p className="text-[10px] text-slate-500">GST {p.tax_rate}%</p>
                        </div>

                        {isOut ? (
                          <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">Out of Stock</span>
                        ) : inCart ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => decreaseQty(p.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold transition">−</button>
                            <span className="text-sm w-6 text-center font-bold text-cyan-300">{getCartQty(p.id)}</span>
                            <button onClick={() => increaseQty(p.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold transition">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(p)}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border border-cyan-400/20 text-cyan-200 text-xs font-semibold hover:from-cyan-500/30 hover:to-indigo-500/30 transition-all"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ─── LIST VIEW ─── */
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-300/80 bg-[#18275a]/70 border-b border-[#33437f]/45">
                    <th className="py-3 px-3 text-left font-medium text-xs">Product</th>
                    <th className="py-3 px-3 text-left font-medium text-xs hidden md:table-cell">Category</th>
                    <th className="py-3 px-3 text-left font-medium text-xs hidden sm:table-cell">SKU</th>
                    <th className="py-3 px-3 text-right font-medium text-xs">Price</th>
                    <th className="py-3 px-3 text-center font-medium text-xs">Stock</th>
                    <th className="py-3 px-3 text-center font-medium text-xs">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const catName = p.category_id ? categoryMap[p.category_id] : "–";
                    const isOut = getLiveStock(p.id) <= 0;
                    const inCart = getCartQty(p.id) > 0;
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-[#33437f]/20 transition ${
                          inCart ? "bg-cyan-500/5" : isOut ? "opacity-50" : "hover:bg-[#1f3370]/20"
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <span className="font-medium text-slate-100">{p.name}</span>
                          {inCart && <span className="ml-2 text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full font-bold">×{getCartQty(p.id)}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs hidden md:table-cell">{catEmojis[catName] || ""} {catName}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs font-mono hidden sm:table-cell">{p.sku}</td>
                        <td className="px-3 py-2.5 text-right text-cyan-200 font-semibold">₹{p.price}</td>
                        <td className="px-3 py-2.5 text-center">{stockBadge(p.id)}</td>
                        <td className="px-3 py-2.5 text-center">
                          {isOut ? (
                            <span className="text-[10px] text-rose-400">Out</span>
                          ) : inCart ? (
                            <div className="inline-flex items-center gap-1">
                              <button onClick={() => decreaseQty(p.id)} className="h-6 w-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition">−</button>
                              <span className="text-xs w-5 text-center font-bold text-cyan-300">{getCartQty(p.id)}</span>
                              <button onClick={() => increaseQty(p.id)} className="h-6 w-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition">+</button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(p)} className="px-3 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/20 text-cyan-200 text-xs font-semibold hover:bg-cyan-500/25 transition">Add</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Portals ── */}
      {typeof document !== "undefined" && createPortal(invoiceModal, document.body)}

      {/* ── Stock notice toast ── */}
      {stockNotice && (
        <div className="fixed top-5 right-5 z-[10000] w-88 max-w-[calc(100vw-2rem)] rounded-2xl border border-rose-400/30 bg-[#1a0f26]/95 text-rose-100 shadow-2xl backdrop-blur-md p-4 fade-in">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-rose-500/25 border border-rose-300/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4" /><path d="M12 17h.01" />
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.14em] text-rose-200/80">Stock Alert</p>
              <p className="text-sm mt-1">{stockNotice}</p>
            </div>
            <button onClick={() => setStockNotice(null)} className="text-rose-200/80 hover:text-rose-100 transition" aria-label="Close">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
