import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Product = { id: number; name: string; sku: string; price: number; stock: number };

type EligibleCustomer = {
  customer_id: number; customer_name: string;
  phone?: string; email?: string;
  invoice_id: number; old_price: number; current_price: number; difference: number;
};

type PriceDropResponse = {
  product_id: number; product_name: string; current_price: number;
  eligible_customers: EligibleCustomer[]; count: number;
};

type HistoryEntry = {
  id: number | null; old_price: number; new_price: number;
  changed_at: string | null; is_current?: boolean;
};

type AuditEntry = {
  id: number; actor_email: string; product_id: string; product_name: string | null;
  old_price: number | null; new_price: number | null;
  bulk: boolean; scheduled: boolean; changed_at: string;
};

type ScheduledChange = {
  id: number; product_id: number; product_name: string;
  current_price: number; new_price: number;
  scheduled_at: string; note: string | null;
  created_by_email: string; created_at: string;
};

type BulkResult = {
  updated: number;
  results: { product_id: number; product_name?: string; old_price?: number; new_price?: number; status: string; reason?: string }[];
};

// ── Skeleton Row ──────────────────────────────────────────────────────────────

function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 pr-4">
          <div className="h-3 rounded-full bg-[#1e2f66]/60 animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Pricing() {
  // products
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // product search combobox
  const [productSearch, setProductSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // selected product
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  // price input mode
  const [priceMode, setPriceMode] = useState<"flat" | "percent">("flat");
  const [priceInput, setPriceInput] = useState<number | "">("");

  const computedNewPrice = useMemo(() => {
    if (!selectedProduct || priceInput === "") return 0;
    if (priceMode === "flat") return Number(priceInput);
    return parseFloat((selectedProduct.price * (1 + Number(priceInput) / 100)).toFixed(2));
  }, [priceMode, priceInput, selectedProduct]);

  const priceWarning = useMemo(() => {
    if (!selectedProduct || computedNewPrice <= 0) return null;
    const ratio = computedNewPrice / selectedProduct.price;
    if (ratio < 0.5) return "⚠️ Price drop > 50% — please verify before updating";
    if (ratio > 3)   return "⚠️ Price increase > 200% — please verify before updating";
    return null;
  }, [computedNewPrice, selectedProduct]);

  const priceDelta = selectedProduct && computedNewPrice
    ? (computedNewPrice - selectedProduct.price).toFixed(2) : null;
  const pricePct = selectedProduct && computedNewPrice && selectedProduct.price
    ? (((computedNewPrice - selectedProduct.price) / selectedProduct.price) * 100).toFixed(1) : null;

  // confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // right-panel tab
  const [activeTab, setActiveTab] = useState<"drops" | "history" | "audit">("drops");

  // price drops
  const [dropsLoading, setDropsLoading] = useState(false);
  const [dropsData, setDropsData] = useState<PriceDropResponse | null>(null);
  const [notifyLoading, setNotifyLoading] = useState(false);

  // price history
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);

  const chartData = useMemo(() => {
    const real = historyData.filter((h) => !h.is_current);
    if (!real.length) return [];
    const pts: { label: string; price: number }[] = [
      { label: "Initial", price: real[0].old_price },
    ];
    for (const h of real) {
      pts.push({
        label: h.changed_at ? new Date(h.changed_at).toLocaleDateString() : "–",
        price: h.new_price,
      });
    }
    // add "Now" sentinel
    const sentinel = historyData.find((h) => h.is_current);
    if (sentinel) pts.push({ label: "Now", price: sentinel.new_price });
    return pts;
  }, [historyData]);

  // audit
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditEntry[]>([]);

  // bulk update
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]);
  const [bulkMode, setBulkMode] = useState<"flat" | "percent_add">("percent_add");
  const [bulkValue, setBulkValue] = useState<number | "">("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  // scheduled changes
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [scheduledList, setScheduledList] = useState<ScheduledChange[]>([]);
  const [schedProdSearch, setSchedProdSearch] = useState("");
  const [schedProdOpen, setSchedProdOpen] = useState(false);
  const schedProdRef = useRef<HTMLDivElement>(null);
  const [schedProdId, setSchedProdId] = useState<number | "">("");
  const [schedNewPrice, setSchedNewPrice] = useState<number | "">("");
  const [schedDateTime, setSchedDateTime] = useState("");
  const [schedNote, setSchedNote] = useState("");
  const [schedSaving, setSchedSaving] = useState(false);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredSchedProds = products.filter(
    (p) =>
      p.name.toLowerCase().includes(schedProdSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(schedProdSearch.toLowerCase())
  );

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>("/products/list");
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch { setProducts([]); }
    finally { setLoadingProducts(false); }
  };

  const fetchDrops = async (pid: number) => {
    setDropsLoading(true);
    try {
      const res = await api.get<PriceDropResponse>(`/price-drops/product/${pid}`);
      setDropsData(res.data ?? null);
    } catch { setDropsData(null); }
    finally { setDropsLoading(false); }
  };

  const fetchHistory = async (pid: number) => {
    setHistoryLoading(true);
    try {
      const res = await api.get<HistoryEntry[]>(`/pricing/history/${pid}`);
      setHistoryData(Array.isArray(res.data) ? res.data : []);
    } catch { setHistoryData([]); }
    finally { setHistoryLoading(false); }
  };

  const fetchAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await api.get<AuditEntry[]>("/pricing/audit");
      setAuditData(Array.isArray(res.data) ? res.data : []);
    } catch { setAuditData([]); }
    finally { setAuditLoading(false); }
  };

  const fetchScheduled = async () => {
    try {
      const res = await api.get<ScheduledChange[]>("/pricing/scheduled");
      setScheduledList(Array.isArray(res.data) ? res.data : []);
    } catch { setScheduledList([]); }
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleSelectProduct = (p: Product) => {
    setSelectedProductId(p.id);
    setProductSearch(`${p.name} — ₹${p.price}`);
    setDropdownOpen(false);
    setPriceInput(p.price);
    fetchDrops(p.id);
    fetchHistory(p.id);
  };

  const handleUpdateClick = () => {
    if (!selectedProductId) { alert("Select a product first."); return; }
    if (computedNewPrice <= 0) { alert("Enter a valid price."); return; }
    setConfirmOpen(true);
  };

  const doUpdate = async () => {
    if (!selectedProductId || computedNewPrice <= 0) return;
    setUpdating(true);
    try {
      await api.post("/pricing/update", { product_id: selectedProductId, new_price: computedNewPrice });
      setConfirmOpen(false);
      await fetchProducts();
      await Promise.all([fetchDrops(Number(selectedProductId)), fetchHistory(Number(selectedProductId)), fetchAudit()]);
    } catch { alert("Price update failed ❌"); }
    finally { setUpdating(false); }
  };

  const handleNotifyAll = async () => {
    if (!selectedProductId) return;
    setNotifyLoading(true);
    try {
      const res = await api.post<{ sent: number; failed: number; eligible: number }>(
        `/pricing/notify-product/${selectedProductId}`
      );
      const { sent, failed, eligible } = res.data;
      alert(`Notified ${sent}/${eligible} customers.${failed > 0 ? ` ${failed} failed.` : ""}`);
    } catch { alert("Failed to send notifications ❌"); }
    finally { setNotifyLoading(false); }
  };

  const handleBulkUpdate = async () => {
    if (!bulkSelectedIds.length || bulkValue === "") { alert("Select products and enter a value."); return; }
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await api.post<BulkResult>("/pricing/bulk-update", {
        product_ids: bulkSelectedIds, mode: bulkMode, value: Number(bulkValue),
      });
      setBulkResult(res.data);
      setBulkSelectedIds([]);
      setBulkValue("");
      await fetchProducts();
    } catch { alert("Bulk update failed ❌"); }
    finally { setBulkLoading(false); }
  };

  const handleScheduleCreate = async () => {
    if (!schedProdId || !schedNewPrice || !schedDateTime) { alert("Fill in all fields."); return; }
    setSchedSaving(true);
    try {
      await api.post("/pricing/scheduled", {
        product_id: schedProdId, new_price: Number(schedNewPrice),
        scheduled_at: new Date(schedDateTime).toISOString(), note: schedNote || undefined,
      });
      setSchedProdId(""); setSchedProdSearch(""); setSchedNewPrice("");
      setSchedDateTime(""); setSchedNote("");
      await fetchScheduled();
    } catch { alert("Failed to schedule price change ❌"); }
    finally { setSchedSaving(false); }
  };

  const handleCancelScheduled = async (id: number) => {
    try {
      await api.delete(`/pricing/scheduled/${id}`);
      await fetchScheduled();
    } catch { alert("Failed to cancel ❌"); }
  };

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    // process any due scheduled changes, then load data
    const init = async () => {
      try { await api.post("/pricing/process-scheduled"); } catch { /* silent */ }
      await fetchProducts();
      await fetchScheduled();
    };
    init();
  }, []);

  useEffect(() => {
    if (activeTab === "audit") fetchAudit();
  }, [activeTab]);

  // click-outside for main dropdown
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // click-outside for schedule product dropdown
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (schedProdRef.current && !schedProdRef.current.contains(e.target as Node))
        setSchedProdOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const stockBadgeClass = (stock: number) =>
    stock === 0
      ? "bg-red-500/20 text-red-400 border border-red-500/30"
      : stock < 10
      ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── ROW 1: Update Price + Tabbed Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Update Price */}
        <div className="glass-card rounded-2xl p-5 fade-in">
          <h2 className="section-title text-gradient mb-4">Update Product Price</h2>

          {loadingProducts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-[#1e2f66]/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Product combobox */}
              <label className="text-sm text-zinc-400">Select Product</label>
              <div ref={dropdownRef} className="relative mt-2">
                <input
                  className="input-surface w-full"
                  placeholder="Search by name or SKU…"
                  value={productSearch}
                  onFocus={() => setDropdownOpen(true)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setDropdownOpen(true);
                    if (!e.target.value) setSelectedProductId("");
                  }}
                />
                {dropdownOpen && filteredProducts.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#33437f]/50 bg-[#0d1635] shadow-xl">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id} type="button"
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#1a2a5e] transition flex items-center justify-between gap-2"
                        onClick={() => handleSelectProduct(p)}
                      >
                        <span className="flex flex-col min-w-0">
                          <span className="font-medium text-zinc-100 truncate">{p.name}</span>
                          <span className="text-zinc-500 text-xs">SKU: {p.sku}</span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          {/* Stock badge */}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${stockBadgeClass(p.stock)}`}>
                            {p.stock === 0 ? "Out" : `${p.stock} left`}
                          </span>
                          <span className="text-cyan-300 text-xs">₹{p.price}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {dropdownOpen && productSearch.length > 0 && filteredProducts.length === 0 && (
                  <div className="absolute z-20 w-full mt-1 rounded-xl border border-[#33437f]/50 bg-[#0d1635] shadow-xl px-4 py-3 text-sm text-zinc-400">
                    No products match &ldquo;{productSearch}&rdquo;
                  </div>
                )}
              </div>

              {/* Price mode toggle */}
              <div className="flex gap-2 mt-4">
                {(["flat", "percent"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPriceMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition border ${
                      priceMode === m
                        ? m === "flat"
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                          : "bg-violet-500/20 border-violet-500/50 text-violet-300"
                        : "border-[#33437f]/40 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {m === "flat" ? "Flat Price (₹)" : "% Change"}
                  </button>
                ))}
              </div>

              {/* Price input */}
              <label className="text-sm text-zinc-400 mt-3 block">
                {priceMode === "flat" ? "New Price (₹)" : "% Change  (e.g. -10 for 10% off)"}
              </label>
              <input
                type="number"
                className="input-surface mt-2"
                placeholder={priceMode === "flat" ? "0.00" : "e.g. -10"}
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value === "" ? "" : Number(e.target.value))}
              />

              {/* Computed price preview in % mode */}
              {priceMode === "percent" && selectedProduct && priceInput !== "" && (
                <p className="text-xs mt-1.5 text-zinc-400">
                  Computed price:{" "}
                  <span className="text-cyan-300 font-medium">₹{computedNewPrice}</span>
                </p>
              )}

              {/* Floor / ceiling warning */}
              {priceWarning && (
                <p className="text-xs mt-2 text-yellow-400 bg-yellow-500/10 border border-yellow-500/25 rounded-lg px-3 py-2">
                  {priceWarning}
                </p>
              )}

              <button onClick={handleUpdateClick} className="btn-primary w-full mt-4 py-2 font-medium">
                Update Price
              </button>
            </>
          )}
        </div>

        {/* RIGHT — Tabbed panel */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 fade-in stagger-1">

          {/* Tab bar */}
          <div className="flex gap-1 mb-4 bg-[#0d1635]/60 rounded-xl p-1">
            {(["drops", "history", "audit"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === tab
                    ? "bg-linear-to-r from-cyan-500/25 to-violet-500/25 text-cyan-200 border border-cyan-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab === "drops" ? "Price Drops" : tab === "history" ? "Price History" : "Audit Trail"}
              </button>
            ))}
          </div>

          {/* ── Tab: Price Drops ── */}
          {activeTab === "drops" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title">Detected Price Drops</h2>
                <div className="flex gap-2">
                  {dropsData && dropsData.count > 0 && (
                    <button
                      onClick={handleNotifyAll}
                      disabled={notifyLoading}
                      className="input-surface px-3 py-1 text-xs w-auto text-violet-300 border-violet-500/30 hover:text-violet-100 transition"
                    >
                      {notifyLoading ? "Sending…" : `Notify All (${dropsData.count})`}
                    </button>
                  )}
                  <button
                    className="input-surface px-3 py-1 text-sm w-auto"
                    onClick={() => { if (selectedProductId) fetchDrops(Number(selectedProductId)); }}
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {!selectedProductId ? (
                <p className="text-zinc-400 mt-3">Select a product to view price drops.</p>
              ) : dropsLoading ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-[#0d1635]/55 border border-[#33437f]/30 rounded-2xl p-4 h-16 animate-pulse" />
                    ))}
                  </div>
                  <table className="w-full text-sm">
                    <tbody>{[1, 2, 3, 4].map((i) => <SkeletonRow key={i} cols={5} />)}</tbody>
                  </table>
                </>
              ) : !dropsData ? (
                <p className="text-zinc-400 mt-3">No drop data found.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "Product",            value: dropsData.product_name },
                      { label: "Current Price",      value: `₹ ${dropsData.current_price}` },
                      { label: "Eligible Customers", value: String(dropsData.count) },
                    ].map((card) => (
                      <div key={card.label} className="bg-[#0d1635]/55 border border-[#33437f]/30 rounded-2xl p-4">
                        <p className="text-sm text-zinc-400">{card.label}</p>
                        <p className="text-xl font-bold mt-1">{card.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-[#33437f]/35 overflow-auto bg-[#0d1635]/55 p-4">
                    <h3 className="font-semibold mb-3">Eligible Customers</h3>
                    {dropsData.eligible_customers.length === 0 ? (
                      <p className="text-zinc-500 text-sm">No eligible customers found.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-300/85 border-b border-[#33437f]/35">
                            <th className="text-left py-2">Customer</th>
                            <th className="text-left py-2">Invoice</th>
                            <th className="text-left py-2">Old Price</th>
                            <th className="text-left py-2">New Price</th>
                            <th className="text-left py-2">Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dropsData.eligible_customers.map((c, idx) => (
                            <tr key={`${c.invoice_id}-${idx}`} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25 hover:bg-[#203063]/28 transition">
                              <td className="py-2">
                                <div className="font-medium">{c.customer_name}</div>
                                <div className="text-xs text-zinc-500">ID: {c.customer_id}</div>
                              </td>
                              <td className="py-2">{c.invoice_id}</td>
                              <td className="py-2">₹ {c.old_price}</td>
                              <td className="py-2">₹ {c.current_price}</td>
                              {/* Red = customer overpaid vs current price */}
                              <td className="py-2 font-semibold text-red-400">
                                ₹ {c.difference.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Tab: Price History ── */}
          {activeTab === "history" && (
            <>
              <h2 className="section-title mb-3">Price History Chart</h2>
              {!selectedProductId ? (
                <p className="text-zinc-400 mt-3">Select a product to view price history.</p>
              ) : historyLoading ? (
                <div className="w-full h-52 rounded-xl bg-[#0d1635]/55 animate-pulse" />
              ) : chartData.length < 2 ? (
                <p className="text-zinc-400 mt-3">No price change history yet for this product.</p>
              ) : (
                <>
                  <div className="h-64 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#33437f44" />
                        <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} width={64} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip
                          contentStyle={{ background: "#0d1635", border: "1px solid #33437f77", borderRadius: "10px", color: "#e2e8f0" }}
                          formatter={(v: number | string | undefined) => {
                            const num = Number(v ?? 0);
                            return [`₹${num}`, "Price"];
                          }}
                        />
                        <Line type="monotone" dataKey="price" stroke="#22d3ee" strokeWidth={2}
                          dot={{ fill: "#22d3ee", r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Change log table */}
                  <div className="mt-4 rounded-xl border border-[#33437f]/35 overflow-auto bg-[#0d1635]/55 p-4">
                    <h3 className="font-semibold mb-3 text-sm">Change Log</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-300/85 border-b border-[#33437f]/35">
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Old Price</th>
                          <th className="text-left py-2">New Price</th>
                          <th className="text-left py-2">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.filter((h) => !h.is_current).map((h, i) => {
                          const diff = h.new_price - h.old_price;
                          return (
                            <tr key={i} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25">
                              <td className="py-2 text-zinc-400 text-xs">
                                {h.changed_at ? new Date(h.changed_at).toLocaleString() : "–"}
                              </td>
                              <td className="py-2">₹ {h.old_price}</td>
                              <td className="py-2">₹ {h.new_price}</td>
                              <td className={`py-2 font-semibold ${diff < 0 ? "text-red-400" : "text-emerald-400"}`}>
                                {diff > 0 ? "+" : ""}₹{diff.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Tab: Audit Trail ── */}
          {activeTab === "audit" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title">Price Change Audit Trail</h2>
                <button className="input-surface px-3 py-1 text-sm w-auto" onClick={fetchAudit}>
                  Refresh
                </button>
              </div>

              {auditLoading ? (
                <table className="w-full text-sm">
                  <tbody>{[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} cols={5} />)}</tbody>
                </table>
              ) : auditData.length === 0 ? (
                <p className="text-zinc-400 mt-3">No price changes recorded yet.</p>
              ) : (
                <div className="rounded-xl border border-[#33437f]/35 overflow-auto bg-[#0d1635]/55 p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-300/85 border-b border-[#33437f]/35">
                        <th className="text-left py-2">Product</th>
                        <th className="text-left py-2">Old</th>
                        <th className="text-left py-2">New</th>
                        <th className="text-left py-2">By</th>
                        <th className="text-left py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditData.map((a) => {
                        return (
                          <tr key={a.id} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25 hover:bg-[#203063]/28 transition">
                            <td className="py-2">
                              <div className="font-medium">{a.product_name ?? `#${a.product_id}`}</div>
                              {a.bulk && <span className="text-xs text-violet-400">bulk</span>}
                              {a.scheduled && <span className="text-xs text-cyan-400 ml-1">scheduled</span>}
                            </td>
                            <td className="py-2">₹{a.old_price ?? "–"}</td>
                            <td className="py-2">₹{a.new_price ?? "–"}</td>
                            <td className="py-2 text-xs text-zinc-400">{a.actor_email}</td>
                            <td className="py-2 text-xs text-zinc-400">
                              {a.changed_at ? new Date(a.changed_at).toLocaleString() : "–"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── ROW 2: Bulk Update ── */}
      <div className="glass-card rounded-2xl fade-in">
        <button
          className="w-full flex items-center justify-between px-5 py-4"
          onClick={() => setBulkOpen((v) => !v)}
        >
          <span className="section-title text-gradient">Bulk Price Update</span>
          <span className="text-zinc-400">{bulkOpen ? "▲" : "▼"}</span>
        </button>

        {bulkOpen && (
          <div className="px-5 pb-5 space-y-4">
            <p className="text-sm text-zinc-400">
              Select products and apply a flat or percentage change to all at once.
            </p>

            {/* Product checkboxes */}
            <div className="flex gap-2 mb-1">
              <button
                className="text-xs text-cyan-400 hover:text-cyan-200 transition"
                onClick={() => setBulkSelectedIds(products.map((p) => p.id))}
              >Select all</button>
              <span className="text-zinc-600">·</span>
              <button
                className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                onClick={() => setBulkSelectedIds([])}
              >Clear</button>
            </div>

            <div className="max-h-40 overflow-y-auto rounded-xl border border-[#33437f]/35 bg-[#0d1635]/55">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-3 px-4 py-2 hover:bg-[#1a2a5e]/50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    className="accent-cyan-400"
                    checked={bulkSelectedIds.includes(p.id)}
                    onChange={(e) =>
                      setBulkSelectedIds((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                      )
                    }
                  />
                  <span className="text-sm text-zinc-100 flex-1 truncate">{p.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${stockBadgeClass(p.stock)}`}>
                    {p.stock === 0 ? "Out" : `${p.stock}`}
                  </span>
                  <span className="text-xs text-zinc-400">₹{p.price}</span>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Mode</label>
                <select
                  className="input-surface"
                  value={bulkMode}
                  onChange={(e) => setBulkMode(e.target.value as "flat" | "percent_add")}
                >
                  <option value="percent_add">% Change (e.g. -10 = 10% off)</option>
                  <option value="flat">Set Flat Price (₹)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  {bulkMode === "flat" ? "New Price (₹)" : "Percentage"}
                </label>
                <input
                  type="number"
                  className="input-surface"
                  placeholder={bulkMode === "flat" ? "e.g. 199" : "e.g. -10"}
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <button
                className="btn-primary px-5 py-2 font-medium"
                disabled={bulkLoading || !bulkSelectedIds.length || bulkValue === ""}
                onClick={handleBulkUpdate}
              >
                {bulkLoading
                  ? "Updating…"
                  : `Apply to ${bulkSelectedIds.length} product${bulkSelectedIds.length !== 1 ? "s" : ""}`}
              </button>
            </div>

            {bulkResult && (
              <div className="rounded-xl border border-[#33437f]/35 bg-[#0d1635]/55 p-4">
                <p className="text-sm font-semibold text-emerald-400 mb-2">
                  Updated {bulkResult.updated} product{bulkResult.updated !== 1 ? "s" : ""}
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#33437f]/35 text-zinc-400">
                      <th className="text-left py-1">Product</th>
                      <th className="text-left py-1">Old</th>
                      <th className="text-left py-1">New</th>
                      <th className="text-left py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResult.results.map((r, i) => (
                      <tr key={i} className="border-b border-[#33437f]/20">
                        <td className="py-1">{r.product_name ?? `#${r.product_id}`}</td>
                        <td className="py-1">{r.old_price != null ? `₹${r.old_price}` : "–"}</td>
                        <td className="py-1">{r.new_price != null ? `₹${r.new_price}` : "–"}</td>
                        <td className={`py-1 ${r.status === "updated" ? "text-emerald-400" : "text-zinc-400"}`}>
                          {r.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ROW 3: Scheduled Price Changes ── */}
      <div className="glass-card rounded-2xl fade-in">
        <button
          className="w-full flex items-center justify-between px-5 py-4"
          onClick={() => {
            setScheduledOpen((v) => !v);
            if (!scheduledOpen) fetchScheduled();
          }}
        >
          <span className="section-title text-gradient">Scheduled Price Changes</span>
          <span className="text-zinc-400">{scheduledOpen ? "▲" : "▼"}</span>
        </button>

        {scheduledOpen && (
          <div className="px-5 pb-5 space-y-5">
            {/* Create form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              {/* Product picker */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Product</label>
                <div ref={schedProdRef} className="relative">
                  <input
                    className="input-surface w-full"
                    placeholder="Search product…"
                    value={schedProdSearch}
                    onFocus={() => setSchedProdOpen(true)}
                    onChange={(e) => {
                      setSchedProdSearch(e.target.value);
                      setSchedProdOpen(true);
                      if (!e.target.value) setSchedProdId("");
                    }}
                  />
                  {schedProdOpen && filteredSchedProds.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 max-h-44 overflow-y-auto rounded-xl border border-[#33437f]/50 bg-[#0d1635] shadow-xl">
                      {filteredSchedProds.map((p) => (
                        <button
                          key={p.id} type="button"
                          className="w-full text-left px-4 py-2 text-sm hover:bg-[#1a2a5e] transition flex justify-between"
                          onClick={() => {
                            setSchedProdId(p.id);
                            setSchedProdSearch(`${p.name} (₹${p.price})`);
                            setSchedProdOpen(false);
                          }}
                        >
                          <span>{p.name}</span>
                          <span className="text-cyan-300 text-xs">₹{p.price}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">New Price (₹)</label>
                <input
                  type="number" className="input-surface" placeholder="0.00"
                  value={schedNewPrice}
                  onChange={(e) => setSchedNewPrice(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Schedule Date & Time</label>
                <input
                  type="datetime-local" className="input-surface"
                  value={schedDateTime} onChange={(e) => setSchedDateTime(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Note (optional)</label>
                <div className="flex gap-2">
                  <input
                    className="input-surface flex-1" placeholder="Reason…"
                    value={schedNote} onChange={(e) => setSchedNote(e.target.value)}
                  />
                  <button
                    className="btn-primary px-4 py-2 font-medium text-sm shrink-0"
                    disabled={schedSaving || !schedProdId || !schedNewPrice || !schedDateTime}
                    onClick={handleScheduleCreate}
                  >
                    {schedSaving ? "…" : "Schedule"}
                  </button>
                </div>
              </div>
            </div>

            {/* Pending list */}
            {scheduledList.length === 0 ? (
              <p className="text-zinc-400 text-sm">No pending scheduled changes.</p>
            ) : (
              <div className="rounded-xl border border-[#33437f]/35 overflow-auto bg-[#0d1635]/55 p-4">
                <h3 className="font-semibold mb-3 text-sm">Pending Changes</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-300/85 border-b border-[#33437f]/35">
                      <th className="text-left py-2">Product</th>
                      <th className="text-left py-2">Current</th>
                      <th className="text-left py-2">New Price</th>
                      <th className="text-left py-2">Scheduled At</th>
                      <th className="text-left py-2">By</th>
                      <th className="text-left py-2">Note</th>
                      <th className="text-left py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledList.map((s) => (
                      <tr key={s.id} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25">
                        <td className="py-2 font-medium">{s.product_name}</td>
                        <td className="py-2">₹{s.current_price}</td>
                        <td className="py-2 text-cyan-300 font-semibold">₹{s.new_price}</td>
                        <td className="py-2 text-zinc-400 text-xs">
                          {new Date(s.scheduled_at).toLocaleString()}
                        </td>
                        <td className="py-2 text-zinc-500 text-xs">{s.created_by_email}</td>
                        <td className="py-2 text-zinc-400 text-xs">{s.note ?? "–"}</td>
                        <td className="py-2">
                          <button
                            className="text-xs text-red-400 hover:text-red-300 transition"
                            onClick={() => handleCancelScheduled(s.id)}
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Confirm Modal ── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm shadow-2xl fade-in">
            <h3 className="text-lg font-semibold text-zinc-100 mb-1">Confirm Price Update</h3>
            <p className="text-sm text-zinc-400 mb-4">{selectedProduct?.name}</p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Old Price</span>
                <span className="font-medium">₹{selectedProduct?.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">New Price</span>
                <span className="font-semibold text-cyan-300">₹{computedNewPrice}</span>
              </div>
              <div className="flex justify-between border-t border-[#33437f]/30 pt-2">
                <span className="text-zinc-400">Change</span>
                <span className={`font-semibold ${Number(priceDelta) < 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {Number(priceDelta) > 0 ? "+" : ""}₹{priceDelta}{" "}
                  ({Number(pricePct) > 0 ? "+" : ""}{pricePct}%)
                </span>
              </div>
            </div>

            {priceWarning && (
              <p className="text-xs mt-3 text-yellow-400 bg-yellow-500/10 border border-yellow-500/25 rounded-lg px-3 py-2">
                {priceWarning}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                className="flex-1 py-2 rounded-xl border border-[#33437f]/50 text-zinc-300 hover:text-white transition text-sm"
                onClick={() => setConfirmOpen(false)}
                disabled={updating}
              >
                Cancel
              </button>
              <button
                className="flex-1 btn-primary py-2 font-medium text-sm"
                onClick={doUpdate}
                disabled={updating}
              >
                {updating ? "Updating…" : "Confirm Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
