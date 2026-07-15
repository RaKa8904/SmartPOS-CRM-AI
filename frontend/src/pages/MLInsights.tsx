import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ═══════════════════════ TYPES ═══════════════════════ */

type TabKey = "segments" | "churn" | "ltv" | "recommendations" | "demand" | "anomalies";

type Product = { id: number; name: string; price?: number; sku?: string };

type CustomerSegment = {
  customer_id: number; name: string; phone?: string | null;
  total_spent: number; total_invoices: number; segment: string;
};

type ChurnCustomer = {
  customer_id: number; name: string; phone?: string | null;
  total_invoices: number; total_spent: number;
  score: number; level: string; reason: string; recency_days: number;
};

type LTVCustomer = {
  customer_id: number; name: string; phone?: string | null;
  total_invoices: number; total_spent: number;
  avg_order_value: number; purchase_freq_per_month: number;
  predicted_ltv: number; ltv_tier: string;
};

type LTVResponse = {
  customers: LTVCustomer[];
  tier_summary: Record<string, number>;
  total_predicted_revenue: number;
};

type RecItem = {
  product_id: number; name: string; sku?: string;
  score: number; confidence?: number | null; lift?: number | null; support?: number | null;
};

type RecResponse = {
  for_product?: { id: number; name: string; sku?: string };
  recommendations?: RecItem[];
};

type PredPrice = {
  product_id?: number; product_name?: string;
  current_price?: number; predicted_next_price?: number;
};

type ForecastItem = { product_id: number; product_name: string; avg_daily_sold: number; trend: string; predicted_7d_total: number; forecast: { date: string; predicted_qty: number }[] };
type DemandResponse = { forecasts: ForecastItem[] };

type InvoiceAnomaly = {
  invoice_id: number; total_amount: number; created_at: string;
  customer_name: string; z_score: number; population_mean: number; description: string;
};
type PriceAnomaly = {
  product_id: number; name: string; price: number;
  avg_category_price: number; z_score: number; description: string;
};
type AnomalyResponse = {
  invoice_anomalies: InvoiceAnomaly[];
  price_anomalies: PriceAnomaly[];
  summary: { invoices_scanned: number; invoice_flags: number; products_scanned: number; price_flags: number };
};

/* ═══════════════════════ HELPERS ═══════════════════════ */

const SEGMENT_COLORS: Record<string, string> = {
  "VIP / High Value": "text-[#2b2005] bg-[#d19f32] border-[#a07418]",
  "High Value":       "text-[#eff6ff] bg-[#3b5e7d] border-[#29425a]",
  "Regular":          "text-[#faf5ff] bg-[#5d4a75] border-[#443657]",
  "Low Value":        "text-[#f1f5f9] bg-[#64748b] border-[#4b586a]",
};

const CHURN_COLORS: Record<string, string> = {
  High:   "text-red-300 bg-red-500/15 border-red-400/30",
  Medium: "text-amber-300 bg-amber-500/15 border-amber-400/30",
  Low:    "text-emerald-300 bg-emerald-500/15 border-emerald-400/30",
};

const LTV_COLORS: Record<string, string> = {
  Platinum: "text-[#faf5ff] bg-[#5d4a75] border-[#443657]",
  Gold:     "text-[#2b2005] bg-[#d19f32] border-[#a07418]",
  Silver:   "text-[#eceff3] bg-[#6a7685] border-[#4b586a]",
  Bronze:   "text-[#faf5ff] bg-[#6f4e37] border-[#553c2b]",
};

const TREND_ICON: Record<string, string> = { rising: "↑", falling: "↓", stable: "→" };
const TREND_COLOR: Record<string, string> = { rising: "text-emerald-400", falling: "text-red-400", stable: "text-slate-400" };

const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtDec = (n: number | null | undefined, d = 2) =>
  n == null ? "–" : n.toFixed(d);

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs border font-medium ${cls}`}>
      {label}
    </span>
  );
}

function SectionCard({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass-card broken-border p-6 shadow-[0_0_30px_rgba(255,0,127,0.06)] fade-in">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="section-title text-gradient font-cyber font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-1 font-cyber">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

type TableProps = { headers: string[]; children: React.ReactNode };
function MLTable({ headers, children }: TableProps) {
  return (
    <div className="overflow-auto rounded-xl border border-[#33437f]/35 bg-[#0d1635]/55">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-300/85 border-b border-[#33437f]/35">
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

type ProductSearchSelectProps = {
  products: Product[];
  value: number | "";
  onChange: (id: number | "") => void;
  searchTerm: string;
  onSearchTermChange: (v: string) => void;
  placeholder?: string;
};

function ProductSearchSelect({
  products,
  value,
  onChange,
  searchTerm,
  onSearchTermChange,
  placeholder = "Search product...",
}: ProductSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const selected = products.find((p) => p.id === value);

  return (
    <div ref={wrapRef} className="relative mt-1 mb-4">
      <button
        type="button"
        className="input-surface text-left flex items-center justify-between"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? "text-[var(--pos-text)] font-semibold" : "text-[var(--pos-muted)]"}>
          {selected ? selected.name : "— Select a product —"}
        </span>
        <span className="text-[var(--pos-muted)]">▾</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-[var(--pos-border)] bg-[var(--pos-surface)] shadow-2xl p-2">
          <input
            className="input-surface mb-2"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            autoFocus
          />
          <div className="max-h-56 overflow-y-auto rounded-lg border border-[#33437f]/30 bg-[#0c1536]/70">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-[#1a2a5e]/60 transition"
            >
              — Select a product —
            </button>
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition ${
                  value === p.id
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "text-slate-200 hover:bg-[#1a2a5e]/60"
                }`}
              >
                {p.name}
              </button>
            ))}
            {products.length === 0 && (
              <p className="px-3 py-2 text-sm text-zinc-500">No matching products.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ COMPONENT ═══════════════════════ */

export default function MLInsights() {
  const [activeTab, setActiveTab] = useState<TabKey>("segments");

  /* --- Product list for selectors --- */
  const [products, setProducts] = useState<Product[]>([]);

  /* --- Customer Segments --- */
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [segmentSearch, setSegmentSearch] = useState("");

  /* --- Churn Risk --- */
  const [churnData, setChurnData] = useState<ChurnCustomer[]>([]);
  const [loadingChurn, setLoadingChurn] = useState(false);
  const [churnSearch, setChurnSearch] = useState("");

  /* --- LTV --- */
  const [ltvData, setLtvData] = useState<LTVResponse | null>(null);
  const [loadingLtv, setLoadingLtv] = useState(false);
  const [ltvSearch, setLtvSearch] = useState("");
  const [ltvTierFilter, setLtvTierFilter] = useState<"All" | "Platinum" | "Gold" | "Silver" | "Bronze">("All");

  /* --- Recommendations --- */
  const [selectedRecId, setSelectedRecId] = useState<number | "">("");
  const [recData, setRecData] = useState<RecResponse | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [recProductSearch, setRecProductSearch] = useState("");

  /* --- Price Prediction --- */
  const [selectedPredId, setSelectedPredId] = useState<number | "">("");
  const [predData, setPredData] = useState<PredPrice | null>(null);
  const [loadingPred, setLoadingPred] = useState(false);
  const [predProductSearch, setPredProductSearch] = useState("");

  /* --- Demand Forecast --- */
  const [demandData, setDemandData] = useState<DemandResponse | null>(null);
  const [loadingDemand, setLoadingDemand] = useState(false);
  const [selectedForecastIdx, setSelectedForecastIdx] = useState(0);
  const [demandSearch, setDemandSearch] = useState("");

  /* --- Anomalies --- */
  const [anomalyData, setAnomalyData] = useState<AnomalyResponse | null>(null);
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);

  /* ──── fetchers ──── */
  const load = async <T,>(
    url: string,
    setter: (v: T) => void,
    setLoading: (v: boolean) => void,
  ) => {
    setLoading(true);
    try {
      const res = await api.get<T>(url);
      setter(res.data);
    } catch (e) { console.error(url, e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.get<Product[]>("/products/list").then((r) => setProducts(Array.isArray(r.data) ? r.data : []));
    load("/ml/customer-segments", (d: CustomerSegment[]) => setSegments(Array.isArray(d) ? d : []), setLoadingSegments);
  }, []);

  /* lazy-load each tab on first visit */
  useEffect(() => {
    if (activeTab === "churn" && churnData.length === 0 && !loadingChurn)
      load<{ customers: ChurnCustomer[] }>("/ml/churn-risk", (d) => setChurnData(d.customers ?? []), setLoadingChurn);
    if (activeTab === "ltv" && !ltvData && !loadingLtv)
      load<LTVResponse>("/ml/customer-ltv", setLtvData, setLoadingLtv);
    if (activeTab === "demand" && !demandData && !loadingDemand)
      load<DemandResponse>("/ml/demand-forecast", setDemandData, setLoadingDemand);
    if (activeTab === "anomalies" && !anomalyData && !loadingAnomalies)
      load<AnomalyResponse>("/ml/anomalies", setAnomalyData, setLoadingAnomalies);
  }, [activeTab]);

  useEffect(() => {
    if (!selectedRecId) { setRecData(null); return; }
    load<RecResponse>(`/ml/recommendations/${selectedRecId}`, setRecData, setLoadingRec);
  }, [selectedRecId]);

  useEffect(() => {
    if (!selectedPredId) { setPredData(null); return; }
    load<PredPrice>(`/ml/predict-price/${selectedPredId}`, setPredData, setLoadingPred);
  }, [selectedPredId]);

  /* ──── tab config ──── */
  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "segments",       label: "Segments",         icon: "⬡" },
    { key: "churn",          label: "Churn Risk",       icon: "⚠" },
    { key: "ltv",            label: "Lifetime Value",   icon: "◈" },
    { key: "recommendations",label: "Recommendations",  icon: "✦" },
    { key: "demand",         label: "Demand Forecast",  icon: "↗" },
    { key: "anomalies",      label: "Anomaly Detection",icon: "⊗" },
  ];

  const filteredSegments = useMemo(() => {
    const q = segmentSearch.trim().toLowerCase();
    if (!q) return segments;
    return segments.filter((c) =>
      [c.name, c.phone ?? "", c.segment, String(c.customer_id)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [segments, segmentSearch]);

  const filteredChurn = useMemo(() => {
    const q = churnSearch.trim().toLowerCase();
    if (!q) return churnData;
    return churnData.filter((c) =>
      [c.name, c.phone ?? "", c.level, c.reason, String(c.customer_id)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [churnData, churnSearch]);

  const filteredLtv = useMemo(() => {
    const list = ltvData?.customers ?? [];
    const q = ltvSearch.trim().toLowerCase();
    const tierFiltered = ltvTierFilter === "All"
      ? list
      : list.filter((c) => c.ltv_tier === ltvTierFilter);
    if (!q) return tierFiltered;
    return tierFiltered.filter((c) =>
      [c.name, c.phone ?? "", c.ltv_tier, String(c.customer_id)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [ltvData, ltvSearch, ltvTierFilter]);

  const filteredRecProducts = useMemo(() => {
    const q = recProductSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.sku ?? "", String(p.id)].join(" ").toLowerCase().includes(q)
    );
  }, [products, recProductSearch]);

  const filteredPredProducts = useMemo(() => {
    const q = predProductSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.sku ?? "", String(p.id)].join(" ").toLowerCase().includes(q)
    );
  }, [products, predProductSearch]);

  const filteredDemandForecasts = useMemo(() => {
    const list = demandData?.forecasts ?? [];
    const q = demandSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((f) =>
      [f.product_name, f.trend, String(f.product_id)].join(" ").toLowerCase().includes(q)
    );
  }, [demandData, demandSearch]);

  useEffect(() => {
    if (selectedForecastIdx >= filteredDemandForecasts.length) {
      setSelectedForecastIdx(0);
    }
  }, [filteredDemandForecasts.length, selectedForecastIdx]);

  /* ══════════════════════════════════════════════════════
     PANEL RENDERERS
  ══════════════════════════════════════════════════════ */

  /* ── 1. Customer Segments ── */
  const renderSegments = () => (
    <SectionCard
      title="Customer Segments"
      subtitle="K-Means clustering on spend, frequency, and avg order value"
      action={
        <button
          onClick={() => load("/ml/customer-segments", (d: CustomerSegment[]) => setSegments(Array.isArray(d) ? d : []), setLoadingSegments)}
          disabled={loadingSegments}
          className="input-surface px-3 py-1 rounded-lg text-xs w-auto"
        >
          {loadingSegments ? "…" : "Refresh"}
        </button>
      }
    >
      <input
        className="input-surface mb-4"
        placeholder="Search customer by name, phone, segment, or ID..."
        value={segmentSearch}
        onChange={(e) => setSegmentSearch(e.target.value)}
      />
      {loadingSegments ? <p className="text-zinc-400">Loading…</p> : segments.length === 0 ? (
        <p className="text-zinc-500">No data.</p>
      ) : filteredSegments.length === 0 ? (
        <p className="text-zinc-500">No matching customers.</p>
      ) : (
        <MLTable headers={["Customer", "Phone", "Spent", "Invoices", "Segment"]}>
          {filteredSegments.map((c) => (
            <tr key={c.customer_id} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25 hover:bg-[#203063]/28 transition">
              <td className="px-3 py-2">{c.name}</td>
              <td className="px-3 py-2 text-zinc-400 font-number">{c.phone ?? "–"}</td>
              <td className="px-3 py-2">₹ <span className="font-number">{fmt(c.total_spent)}</span></td>
              <td className="px-3 py-2 font-number">{c.total_invoices}</td>
              <td className="px-3 py-2">
                <Badge label={c.segment || "Low Value"} cls={SEGMENT_COLORS[c.segment] ?? SEGMENT_COLORS["Low Value"]} />
              </td>
            </tr>
          ))}
        </MLTable>
      )}
    </SectionCard>
  );

  /* ── 2. Churn Risk ── */
  const renderChurn = () => (
    <SectionCard
      title="Churn Risk Prediction"
      subtitle="RFM-based score 0–100. High ≥ 65, Medium ≥ 35, Low < 35"
      action={
        <button
          onClick={() => load<{ customers: ChurnCustomer[] }>("/ml/churn-risk", (d) => setChurnData(d.customers ?? []), setLoadingChurn)}
          disabled={loadingChurn}
          className="input-surface px-3 py-1 rounded-lg text-xs w-auto"
        >
          {loadingChurn ? "…" : "Refresh"}
        </button>
      }
    >
      <input
        className="input-surface mb-4"
        placeholder="Search customer by name, risk level, reason, or ID..."
        value={churnSearch}
        onChange={(e) => setChurnSearch(e.target.value)}
      />
      {loadingChurn ? <p className="text-zinc-400">Calculating…</p> : churnData.length === 0 ? (
        <p className="text-zinc-500">No data.</p>
      ) : filteredChurn.length === 0 ? (
        <p className="text-zinc-500">No matching customers.</p>
      ) : (
        <>
          {/* Mini summary bar */}
          <div className="flex gap-3 mb-4 flex-wrap">
            {(["High", "Medium", "Low"] as const).map((lv) => {
              const count = filteredChurn.filter((c) => c.level === lv).length;
              return (
                <div key={lv} className={`flex items-center gap-2 px-3 py-2 rounded-tr-lg rounded-bl-lg border text-sm ${CHURN_COLORS[lv]}`}>
                  <span className="font-bold text-lg font-number">{count}</span>
                  <span>{lv} Risk</span>
                </div>
              );
            })}
          </div>
          <MLTable headers={["Customer", "Last Purchase", "Score", "Risk", "Reason"]}>
            {filteredChurn.map((c) => (
              <tr key={c.customer_id} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25 hover:bg-[#203063]/28 transition">
                <td className="px-3 py-2">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-zinc-500 font-number">{c.phone ?? "–"}</p>
                </td>
                <td className="px-3 py-2 text-zinc-400 text-sm"><span className="font-number">{c.recency_days}</span>d ago</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-[#1a2a5e] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${c.score}%`,
                          background: c.level === "High" ? "#f87171" : c.level === "Medium" ? "#fbbf24" : "#34d399",
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold font-number">{c.score}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Badge label={c.level} cls={CHURN_COLORS[c.level]} />
                </td>
                <td className="px-3 py-2 text-xs text-zinc-400 max-w-xs">{c.reason}</td>
              </tr>
            ))}
          </MLTable>
        </>
      )}
    </SectionCard>
  );

  /* ── 3. Customer LTV ── */
  const renderLTV = () => (
    <SectionCard
      title="Customer Lifetime Value"
      subtitle="24-month predicted LTV using avg order value × purchase frequency"
      action={
        <button
          onClick={() => load<LTVResponse>("/ml/customer-ltv", setLtvData, setLoadingLtv)}
          disabled={loadingLtv}
          className="input-surface px-3 py-1 rounded-lg text-xs w-auto"
        >
          {loadingLtv ? "…" : "Refresh"}
        </button>
      }
    >
      <input
        className="input-surface mb-4"
        placeholder="Search customer by name, tier, phone, or ID..."
        value={ltvSearch}
        onChange={(e) => setLtvSearch(e.target.value)}
      />
      {loadingLtv ? <p className="text-zinc-400">Calculating…</p> : !ltvData ? (
        <p className="text-zinc-500">No data.</p>
      ) : filteredLtv.length === 0 ? (
        <p className="text-zinc-500">No matching customers.</p>
      ) : (
        <>
          {/* Tier summary + total */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              type="button"
              onClick={() => setLtvTierFilter("All")}
              className={`flex items-center gap-2 px-4 py-2 rounded-tr-xl rounded-bl-xl border text-sm transition-all duration-150 ${
                ltvTierFilter === "All"
                  ? "text-[#cba16c] bg-[rgba(74,104,105,0.18)] border-[--pos-accent] shadow-sm"
                  : "text-[#8e909a] bg-[#121214]/45 border-[rgba(74,104,105,0.22)] hover:bg-[#1c1c1f]/45 hover:text-[#e1e2e7]"
              }`}
            >
              <span className="font-bold text-lg font-number">{ltvData.customers.length}</span>
              <span>All</span>
            </button>
            {(["Platinum", "Gold", "Silver", "Bronze"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setLtvTierFilter(t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-tr-xl rounded-bl-xl border text-sm transition-all duration-150 ${LTV_COLORS[t]} ${
                  ltvTierFilter === t ? "ring-2 ring-[--pos-accent] opacity-100 shadow-md" : "opacity-75 hover:opacity-100"
                }`}
              >
                <span className="font-bold text-lg font-number">{ltvData.tier_summary[t] ?? 0}</span>
                <span>{t}</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1 text-sm text-slate-300 border border-[rgba(255,0,127,0.15)] rounded-tr-xl rounded-bl-xl px-3 py-2 bg-[#04030d]/85 shadow-[0_0_15px_rgba(255,0,127,0.06)]">
              <span className="text-xs text-zinc-400">Total predicted revenue</span>
              <span className="font-cyber font-bold text-[--pos-accent-pink] neon-glow-magenta ml-1">₹ <span className="font-number">{fmt(ltvData.total_predicted_revenue)}</span></span>
            </div>
          </div>
          <MLTable headers={["Customer", "Invoices", "Avg Order", "Freq/mo", "Predicted LTV", "Tier"]}>
            {filteredLtv.map((c) => (
              <tr key={c.customer_id} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25 hover:bg-[#203063]/28 transition">
                <td className="px-3 py-2">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-zinc-500 font-number">{c.phone ?? "–"}</p>
                </td>
                <td className="px-3 py-2 font-number">{c.total_invoices}</td>
                <td className="px-3 py-2">₹ <span className="font-number">{fmt(c.avg_order_value)}</span></td>
                <td className="px-3 py-2 font-number">{c.purchase_freq_per_month}</td>
                <td className="px-3 py-2 font-bold text-cyan-300">₹ <span className="font-number">{fmt(c.predicted_ltv)}</span></td>
                <td className="px-3 py-2">
                  <Badge label={c.ltv_tier} cls={LTV_COLORS[c.ltv_tier] ?? ""} />
                </td>
              </tr>
            ))}
          </MLTable>
        </>
      )}
    </SectionCard>
  );

  /* ── 4. Recommendations + Price Prediction ── */
  const renderRecommendations = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Recommendations */}
      <div className="lg:col-span-7">
        <SectionCard title="Product Recommendations" subtitle="Association rules scored by lift (higher = stronger pairing)">
          <ProductSearchSelect
            products={filteredRecProducts}
            value={selectedRecId}
            onChange={setSelectedRecId}
            searchTerm={recProductSearch}
            onSearchTermChange={setRecProductSearch}
            placeholder="Search inside dropdown (name, SKU, ID)..."
          />
          {loadingRec ? <p className="text-zinc-400">Loading…</p> :
            !recData ? <p className="text-zinc-500 text-sm">Select a product above.</p> :
            (recData.recommendations ?? []).length === 0 ? <p className="text-zinc-500 text-sm">Not enough purchase data yet.</p> : (
              <div className="space-y-2">
                {(recData.recommendations ?? []).map((r, i) => (
                  <div key={r.product_id} className="flex items-center gap-3 p-3 bg-[#04030d]/55 border border-[rgba(255,0,127,0.15)] rounded-xl">
                    <span className="text-xs font-bold text-zinc-500 w-4 font-number">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-zinc-500 font-number">{r.sku}</p>
                    </div>
                    <div className="text-right text-xs font-number">
                      {r.lift != null ? (
                        <>
                          <p className="text-cyan-300 font-bold">Lift {fmtDec(r.lift)}</p>
                          <p className="text-zinc-500">Conf {fmtDec(r.confidence)}</p>
                        </>
                      ) : (
                        <p className="text-zinc-400">Score {r.score}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </SectionCard>
      </div>

      {/* Price Prediction */}
      <div className="lg:col-span-5 lg:translate-y-8 lg:-ml-4 z-10 transition-all duration-300 hover:translate-y-4 hover:-ml-2">
        <SectionCard title="Price Trend Prediction" subtitle="Linear regression on price history to forecast next price">
          <ProductSearchSelect
            products={filteredPredProducts}
            value={selectedPredId}
            onChange={setSelectedPredId}
            searchTerm={predProductSearch}
            onSearchTermChange={setPredProductSearch}
            placeholder="Search inside dropdown (name, SKU, ID)..."
          />
          {loadingPred ? <p className="text-zinc-400">Predicting…</p> :
            !predData ? <p className="text-zinc-500 text-sm">Select a product above.</p> :
            typeof predData.predicted_next_price === "number" ? (
              <div className="space-y-3">
                <div className="flex gap-4">
                  <div className="flex-1 p-3 bg-[#04030d]/55 border border-[rgba(255,0,127,0.15)] rounded-xl text-center">
                    <p className="text-xs text-zinc-400 mb-1">Current Price</p>
                    <p className="text-xl font-bold">₹ <span className="font-number">{fmtDec(predData.current_price)}</span></p>
                  </div>
                  <div className="flex-1 p-3 bg-cyan-950/40 border border-cyan-400/25 rounded-xl text-center">
                    <p className="text-xs text-zinc-400 mb-1 text-[--pos-accent-cyan]">Predicted Next</p>
                    <p className="text-xl font-bold text-cyan-300">₹ <span className="font-number">{fmtDec(predData.predicted_next_price)}</span></p>
                  </div>
                </div>
                <p className="text-xs text-zinc-500">{predData.product_name}</p>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Not enough price history (need 2+ changes).</p>
            )
          }
        </SectionCard>
      </div>
    </div>
  );

  /* ── 5. Demand Forecast ── */
  const renderDemand = () => {
    const selected = filteredDemandForecasts[selectedForecastIdx];
    return (
      <SectionCard
        title="Demand Forecasting"
        subtitle="30-day linear trend model projecting next 7 days per product"
        action={
          <button
            onClick={() => { setDemandData(null); load<DemandResponse>("/ml/demand-forecast", setDemandData, setLoadingDemand); }}
            disabled={loadingDemand}
            className="input-surface px-3 py-1 rounded-lg text-xs w-auto"
          >
            {loadingDemand ? "…" : "Refresh"}
          </button>
        }
      >
        <input
          className="input-surface mb-4"
          placeholder="Search product in forecast by name, trend, or ID..."
          value={demandSearch}
          onChange={(e) => setDemandSearch(e.target.value)}
        />
        {loadingDemand ? <p className="text-zinc-400">Forecasting…</p> : (demandData?.forecasts ?? []).length === 0 ? (
          <p className="text-zinc-500">No sales data in last 30 days.</p>
        ) : filteredDemandForecasts.length === 0 ? (
          <p className="text-zinc-500">No matching forecast products.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Product selector list */}
            <div className="lg:col-span-4 space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {filteredDemandForecasts.map((f, i) => (
                <button
                  key={f.product_id}
                  onClick={() => setSelectedForecastIdx(i)}
                  className={`w-full text-left p-2.5 rounded-xl border text-sm transition ${i === selectedForecastIdx ? "border-[--pos-accent-cyan] bg-cyan-950/40" : "border-[rgba(255,0,127,0.15)] bg-[#04030d]/40 hover:bg-[#1a2a5e]/40"}`}
                >
                  <p className="font-medium truncate">{f.product_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-400"><span className="font-number">{f.avg_daily_sold}</span>/day avg</span>
                    <span className={`text-xs font-bold ${TREND_COLOR[f.trend]}`}>{TREND_ICON[f.trend]} {f.trend}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Forecast chart */}
            {selected && (
              <div className="lg:col-span-8 lg:translate-y-2 lg:-ml-2 z-10 bg-[var(--pos-border-glow)] p-4 border border-[var(--pos-border)] rounded-tr-3xl rounded-bl-3xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-[var(--pos-text)]">{selected.product_name}</p>
                    <p className="text-xs text-[var(--pos-muted)]">
                      7-day forecast: <span className="text-cyan-600 dark:text-cyan-300 font-bold"><span className="font-number">{selected.predicted_7d_total}</span> units</span>
                      &nbsp;|&nbsp;
                      Trend: <span className={`font-bold ${TREND_COLOR[selected.trend]}`}>{TREND_ICON[selected.trend]} {selected.trend}</span>
                    </p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={selected.forecast} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--pos-muted)" }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--pos-muted)" }} width={28} />
                    <Tooltip
                      contentStyle={{ background: "var(--pos-surface)", border: "1px solid var(--pos-border)", borderRadius: "8px", fontSize: 12, color: "var(--pos-text)" }}
                      labelFormatter={(l) => `Date: ${l}`}
                      formatter={(v) => [`${Number(v)} units`, "Forecast"]}
                    />
                    <Area type="monotone" dataKey="predicted_qty" stroke="#22d3ee" fill="url(#demandGrad)" strokeWidth={2} dot={{ r: 3, fill: "#22d3ee" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    );
  };

  /* ── 6. Anomaly Detection ── */
  const renderAnomalies = () => {
    const summary = anomalyData?.summary;
    return (
      <SectionCard
        title="Anomaly Detection"
        subtitle="Z-score outlier detection on invoice totals and product pricing"
        action={
          <button
            onClick={() => { setAnomalyData(null); load<AnomalyResponse>("/ml/anomalies", setAnomalyData, setLoadingAnomalies); }}
            disabled={loadingAnomalies}
            className="input-surface px-3 py-1 rounded-lg text-xs w-auto"
          >
            {loadingAnomalies ? "…" : "Refresh"}
          </button>
        }
      >
        {loadingAnomalies ? <p className="text-zinc-400">Scanning…</p> : !anomalyData ? (
          <p className="text-zinc-500">No data.</p>
        ) : (
          <div className="space-y-6">
            {/* Summary strip */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {([
                  ["Invoices Scanned", summary.invoices_scanned, "text-slate-300"],
                  ["Invoice Flags",    summary.invoice_flags,    "text-red-300"],
                  ["Products Scanned", summary.products_scanned, "text-slate-300"],
                  ["Price Flags",      summary.price_flags,      "text-amber-300"],
                ] as [string, number, string][]).map(([label, val, cls]) => (
                  <div key={label} className="p-3 rounded-tr-xl rounded-bl-xl border border-[rgba(255,0,127,0.15)] bg-[#04030d]/50">
                    <p className={`text-xl font-bold font-number ${cls}`}>{val}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 font-cyber">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Invoice anomalies */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Invoice Anomalies</h3>
              {anomalyData.invoice_anomalies.length === 0 ? (
                <p className="text-zinc-500 text-sm">No unusual invoices detected.</p>
              ) : (
                <MLTable headers={["Invoice #", "Amount", "vs Mean", "Z-Score", "Customer", "Date"]}>
                  {anomalyData.invoice_anomalies.map((a) => (
                    <tr key={a.invoice_id} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25 hover:bg-[#203063]/28 transition">
                      <td className="px-3 py-2 font-number">#{a.invoice_id}</td>
                      <td className="px-3 py-2 font-bold text-red-300">₹ <span className="font-number">{fmt(a.total_amount)}</span></td>
                      <td className="px-3 py-2 text-zinc-400 text-xs">avg ₹ <span className="font-number">{fmt(a.population_mean)}</span></td>
                      <td className="px-3 py-2">
                        <span className={`font-bold text-sm font-number ${Math.abs(a.z_score) >= 3 ? "text-red-400" : "text-amber-400"}`}>
                          {a.z_score > 0 ? "+" : ""}{a.z_score}σ
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-300">{a.customer_name}</td>
                      <td className="px-3 py-2 text-zinc-500 text-xs font-number">{a.created_at}</td>
                    </tr>
                  ))}
                </MLTable>
              )}
            </div>

            {/* Price anomalies */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Price Anomalies</h3>
              {anomalyData.price_anomalies.length === 0 ? (
                <p className="text-zinc-500 text-sm">No unusual product prices detected.</p>
              ) : (
                <MLTable headers={["Product", "Price", "Category Avg", "Z-Score", "Note"]}>
                  {anomalyData.price_anomalies.map((a) => (
                    <tr key={a.product_id} className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25 hover:bg-[#203063]/28 transition">
                      <td className="px-3 py-2 font-medium">{a.name}</td>
                      <td className="px-3 py-2 text-amber-300 font-bold">₹ <span className="font-number">{fmt(a.price)}</span></td>
                      <td className="px-3 py-2 text-zinc-400">₹ <span className="font-number">{fmt(a.avg_category_price)}</span></td>
                      <td className="px-3 py-2">
                        <span className={`font-bold text-sm font-number ${Math.abs(a.z_score) >= 3 ? "text-red-400" : "text-amber-400"}`}>
                          {a.z_score > 0 ? "+" : ""}{a.z_score}σ
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-400">{a.description}</td>
                    </tr>
                  ))}
                </MLTable>
              )}
            </div>
          </div>
        )}
      </SectionCard>
    );
  };

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-tr-lg rounded-bl-lg rounded-tl-sm rounded-br-sm text-sm font-cyber font-semibold border transition-all duration-150 ${
              activeTab === t.key
                ? "bg-[rgba(74,104,105,0.18)] border-[--pos-accent] text-[--pos-accent-copper] shadow-md"
                : "border-[rgba(74,104,105,0.12)] text-[#8e909a] hover:bg-white/5 hover:text-[#e1e2e7]"
            }`}
          >
            <span className="text-base leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Active panel */}
      {activeTab === "segments"        && renderSegments()}
      {activeTab === "churn"           && renderChurn()}
      {activeTab === "ltv"             && renderLTV()}
      {activeTab === "recommendations" && renderRecommendations()}
      {activeTab === "demand"          && renderDemand()}
      {activeTab === "anomalies"       && renderAnomalies()}
    </div>
  );
}
