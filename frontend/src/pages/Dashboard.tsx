import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { api } from "../api";

type DashboardResponse = {
  time_window: {
    start_date: string;
    end_date: string;
    days: number;
  };
  kpis: {
    revenue_today: number;
    invoices_today: number;
    avg_bill_today: number;
    conversion_rate_today: number;
    refund_rate_today: number;
    sparkline: {
      revenue: number[];
      invoices: number[];
      avg_bill: number[];
      conversion: number[];
      refund: number[];
      labels: string[];
    };
  };
  time_intelligence: {
    series: Array<{ date: string; revenue: number; invoices: number }>;
    current: { revenue: number; invoices: number };
    previous: { revenue: number; invoices: number };
    delta_pct: { revenue: number; invoices: number };
  };
  sales_heatmap: {
    max_count: number;
    cells: Array<{ day: number; hour: number; count: number }>;
    labels: { days: string[]; hours: number[] };
  };
  cashier_matrix: Array<{
    cashier_email: string;
    invoice_count: number;
    avg_bill: number;
    revenue: number;
    bubble: number;
  }>;
  inventory_risk: {
    total_products: number;
    out_of_stock_count: number;
    low_stock_count: number;
    risk_score: number;
    likely_stockouts: Array<{
      id: number;
      name: string;
      sku: string;
      stock: number;
      severity: "critical" | "high" | "medium" | "low";
    }>;
  };
  alerts: Array<{
    id: number;
    time: string | null;
    actor: string;
    action: string;
    entity: string;
    message: string;
  }>;
  goals: {
    daily_goal: number;
    daily_actual: number;
    daily_progress_pct: number;
    weekly_goal: number;
    weekly_actual: number;
    weekly_progress_pct: number;
    projected_eod: number;
  };
};

type PeriodMode = "today" | "7d" | "30d" | "custom";

function fmtDate(value: string | null): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

function compactEmail(email: string): string {
  if (!email) return "unknown";
  return email.length > 20 ? `${email.slice(0, 18)}..` : email;
}

function sparkData(values: number[], labels: string[]) {
  return values.map((v, i) => ({ v, label: labels[i] ?? String(i) }));
}

function intensityColor(count: number, maxCount: number): string {
  if (count <= 0 || maxCount <= 0) return "rgba(76, 90, 145, 0.18)";
  const ratio = Math.min(1, count / maxCount);
  if (ratio < 0.25) return "rgba(45, 212, 191, 0.3)";
  if (ratio < 0.5) return "rgba(34, 211, 238, 0.45)";
  if (ratio < 0.75) return "rgba(59, 130, 246, 0.65)";
  return "rgba(147, 51, 234, 0.85)";
}

function severityClass(severity: string): string {
  if (severity === "critical") return "bg-rose-500/20 text-rose-200 border-rose-400/30";
  if (severity === "high") return "bg-orange-500/20 text-orange-200 border-orange-400/30";
  if (severity === "medium") return "bg-yellow-500/20 text-yellow-200 border-yellow-400/30";
  return "bg-emerald-500/20 text-emerald-200 border-emerald-400/30";
}

export default function Dashboard() {
  const [mode, setMode] = useState<PeriodMode>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardResponse | null>(null);

  const fetchDashboard = async (nextMode: PeriodMode, start?: string, end?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (nextMode === "today") params.days = 1;
      if (nextMode === "7d") params.days = 7;
      if (nextMode === "30d") params.days = 30;
      if (nextMode === "custom" && start && end) {
        params.start_date = start;
        params.end_date = end;
      }
      const res = await api.get<DashboardResponse>("/analytics/dashboard-v2", { params });
      setData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load advanced dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard("7d");
  }, []);

  const heatRows = useMemo(() => {
    if (!data) return [] as Array<{ dayLabel: string; cells: Array<{ hour: number; count: number }> }>;
    return data.sales_heatmap.labels.days.map((label, dayIdx) => {
      const cells = data.sales_heatmap.cells
        .filter((c) => c.day === dayIdx)
        .sort((a, b) => a.hour - b.hour)
        .map((c) => ({ hour: c.hour, count: c.count }));
      return { dayLabel: label, cells };
    });
  }, [data]);

  const periodSubtitle = useMemo(() => {
    if (!data) return "";
    return `${data.time_window.start_date} to ${data.time_window.end_date}`;
  }, [data]);

  if (loading) {
    return <p className="text-zinc-400">Loading advanced dashboard...</p>;
  }

  if (!data) {
    return <p className="text-rose-300">Could not load dashboard data.</p>;
  }

  const spark = data.kpis.sparkline;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 fade-in">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h2 className="section-title text-gradient mb-1">Executive Control Dashboard</h2>
            <p className="text-sm text-slate-300/80">Advanced operational intelligence for revenue, staffing, risk, and security alerts.</p>
            <p className="text-xs text-slate-400 mt-1">Window: {periodSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setMode("today"); fetchDashboard("today"); }} className={`px-3 py-1.5 rounded-lg text-xs border ${mode === "today" ? "bg-cyan-500/25 border-cyan-300/40 text-cyan-100" : "bg-white/5 border-white/10 text-slate-300"}`}>Today</button>
            <button onClick={() => { setMode("7d"); fetchDashboard("7d"); }} className={`px-3 py-1.5 rounded-lg text-xs border ${mode === "7d" ? "bg-cyan-500/25 border-cyan-300/40 text-cyan-100" : "bg-white/5 border-white/10 text-slate-300"}`}>7D</button>
            <button onClick={() => { setMode("30d"); fetchDashboard("30d"); }} className={`px-3 py-1.5 rounded-lg text-xs border ${mode === "30d" ? "bg-cyan-500/25 border-cyan-300/40 text-cyan-100" : "bg-white/5 border-white/10 text-slate-300"}`}>30D</button>
            <button onClick={() => setMode("custom")} className={`px-3 py-1.5 rounded-lg text-xs border ${mode === "custom" ? "bg-cyan-500/25 border-cyan-300/40 text-cyan-100" : "bg-white/5 border-white/10 text-slate-300"}`}>Custom</button>
          </div>
        </div>

        {mode === "custom" && (
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input-surface max-w-44" />
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input-surface max-w-44" />
            <button
              onClick={() => {
                if (!customStart || !customEnd) {
                  alert("Choose both start and end date");
                  return;
                }
                fetchDashboard("custom", customStart, customEnd);
              }}
              className="px-3 py-1.5 rounded-lg text-xs border bg-cyan-500/25 border-cyan-300/40 text-cyan-100"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* 1) Executive KPI strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-300/70">Revenue Today</p>
          <p className="text-2xl font-bold text-emerald-300 mt-1">Rs {data.kpis.revenue_today.toFixed(2)}</p>
          <ResponsiveContainer width="100%" height={48}>
            <AreaChart data={sparkData(spark.revenue, spark.labels)}>
              <Area dataKey="v" stroke="#4ade80" fill="#22c55e" fillOpacity={0.25} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-300/70">Invoices Today</p>
          <p className="text-2xl font-bold text-cyan-300 mt-1">{data.kpis.invoices_today}</p>
          <ResponsiveContainer width="100%" height={48}>
            <AreaChart data={sparkData(spark.invoices, spark.labels)}>
              <Area dataKey="v" stroke="#22d3ee" fill="#0ea5e9" fillOpacity={0.25} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-300/70">Avg Bill</p>
          <p className="text-2xl font-bold text-indigo-300 mt-1">Rs {data.kpis.avg_bill_today.toFixed(2)}</p>
          <ResponsiveContainer width="100%" height={48}>
            <AreaChart data={sparkData(spark.avg_bill, spark.labels)}>
              <Area dataKey="v" stroke="#818cf8" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-300/70">Conversion</p>
          <p className="text-2xl font-bold text-amber-300 mt-1">{data.kpis.conversion_rate_today.toFixed(1)}%</p>
          <ResponsiveContainer width="100%" height={48}>
            <AreaChart data={sparkData(spark.conversion, spark.labels)}>
              <Area dataKey="v" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.23} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-300/70">Refund Rate</p>
          <p className="text-2xl font-bold text-rose-300 mt-1">{data.kpis.refund_rate_today.toFixed(1)}%</p>
          <ResponsiveContainer width="100%" height={48}>
            <AreaChart data={sparkData(spark.refund, spark.labels)}>
              <Area dataKey="v" stroke="#fb7185" fill="#f43f5e" fillOpacity={0.23} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2 + 7) Time intelligence + Goal tracking */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-5 xl:col-span-2">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Time Intelligence</h3>
              <p className="text-xs text-slate-300/70">Revenue vs invoices with previous-period deltas</p>
            </div>
            <div className="text-right text-xs">
              <p className={`${data.time_intelligence.delta_pct.revenue >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                Revenue: {data.time_intelligence.delta_pct.revenue >= 0 ? "+" : ""}{data.time_intelligence.delta_pct.revenue}%
              </p>
              <p className={`${data.time_intelligence.delta_pct.invoices >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                Invoices: {data.time_intelligence.delta_pct.invoices >= 0 ? "+" : ""}{data.time_intelligence.delta_pct.invoices}%
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.time_intelligence.series} margin={{ top: 10, right: 20, left: 0, bottom: 35 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#26336b" />
              <XAxis dataKey="date" stroke="#9fb8e0" tick={{ fontSize: 11 }} angle={-18} textAnchor="end" height={54} />
              <YAxis yAxisId="left" stroke="#9fb8e0" tickFormatter={(v) => `Rs ${v}`} />
              <YAxis yAxisId="right" orientation="right" stroke="#d8b4fe" allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#131a38", border: "1px solid #3f57aa", borderRadius: "10px", color: "#dbe8ff" }}
                formatter={(value, name) => {
                  if (name === "Revenue") return [`Rs ${Number(value ?? 0).toFixed(2)}`, "Revenue"];
                  return [Number(value ?? 0), "Invoices"];
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar yAxisId="right" dataKey="invoices" name="Invoices" fill="#22d3ee" radius={[8, 8, 0, 0]} />
              <Line yAxisId="left" dataKey="revenue" name="Revenue" stroke="#4ade80" strokeWidth={3} dot={{ r: 3, fill: "#0b1029" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold">Goal Tracking</h3>
          <p className="text-xs text-slate-300/70 mb-4">Daily/weekly targets with end-of-day projection</p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-300">
                <span>Daily Goal</span>
                <span>Rs {data.goals.daily_actual.toFixed(0)} / {data.goals.daily_goal.toFixed(0)}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-2 bg-emerald-400" style={{ width: `${Math.min(100, data.goals.daily_progress_pct)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 text-slate-300">
                <span>Weekly Goal</span>
                <span>Rs {data.goals.weekly_actual.toFixed(0)} / {data.goals.weekly_goal.toFixed(0)}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-2 bg-cyan-400" style={{ width: `${Math.min(100, data.goals.weekly_progress_pct)}%` }} />
              </div>
            </div>

            <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-3">
              <p className="text-xs text-slate-300/75">Projected End of Day Revenue</p>
              <p className="text-xl font-bold text-cyan-200 mt-1">Rs {data.goals.projected_eod.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3 + 6) Heatmap + Alert rail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-5 xl:col-span-2">
          <h3 className="text-lg font-semibold">Operational Heatmap</h3>
          <p className="text-xs text-slate-300/70 mb-4">Invoice density by day-of-week and hour</p>
          <div className="overflow-x-auto">
            <div className="min-w-245">
              <div className="grid grid-cols-[72px_repeat(24,minmax(0,1fr))] gap-1 mb-2">
                <div />
                {data.sales_heatmap.labels.hours.map((h) => (
                  <div key={`h-${h}`} className="text-[10px] text-slate-400 text-center">{h}</div>
                ))}
              </div>

              {heatRows.map((row) => (
                <div key={row.dayLabel} className="grid grid-cols-[72px_repeat(24,minmax(0,1fr))] gap-1 mb-1">
                  <div className="text-xs text-slate-300/80 flex items-center">{row.dayLabel}</div>
                  {row.cells.map((c) => (
                    <div
                      key={`${row.dayLabel}-${c.hour}`}
                      className="h-5 rounded-sm border border-white/5"
                      style={{ background: intensityColor(c.count, data.sales_heatmap.max_count) }}
                      title={`${row.dayLabel} ${c.hour}:00 -> ${c.count} invoices`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold">Alert & Activity Rail</h3>
          <p className="text-xs text-slate-300/70 mb-4">Security, admin, pricing, and inventory signals</p>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {data.alerts.map((a) => (
              <div key={a.id} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                <p className="text-[11px] text-cyan-200 font-semibold">{a.action}</p>
                <p className="text-[11px] text-slate-300/80">{a.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">{a.actor} · {fmtDate(a.time)}</p>
              </div>
            ))}
            {data.alerts.length === 0 && <p className="text-xs text-slate-400">No recent alerts.</p>}
          </div>
        </div>
      </div>

      {/* 4 + 5) Cashier matrix + inventory risk */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold">Cashier Performance Matrix</h3>
          <p className="text-xs text-slate-300/70 mb-4">Bubble map: invoices vs avg bill, bubble size by revenue</p>

          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#26336b" />
              <XAxis dataKey="invoice_count" type="number" stroke="#9fb8e0" name="Invoices" />
              <YAxis dataKey="avg_bill" type="number" stroke="#9fb8e0" name="Avg Bill" tickFormatter={(v) => `Rs ${v}`} />
              <ZAxis dataKey="bubble" range={[80, 900]} />
              <Tooltip
                cursor={{ strokeDasharray: "4 4" }}
                contentStyle={{ background: "#101a45", border: "1px solid #5f7fe0", borderRadius: "10px", color: "#f1f7ff" }}
                itemStyle={{ color: "#f1f7ff", fontWeight: 600 }}
                labelStyle={{ color: "#a8ddff", fontWeight: 700 }}
                formatter={(value, name) => {
                  if (name === "Avg Bill") return [`Rs ${Number(value ?? 0).toFixed(2)}`, "Avg Bill"];
                  return [Number(value ?? 0), name];
                }}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as { cashier_email?: string } | undefined;
                  return row?.cashier_email ?? "Cashier";
                }}
              />
              <Scatter name="Cashiers" data={data.cashier_matrix} fill="#22d3ee" />
            </ScatterChart>
          </ResponsiveContainer>

          <div className="mt-2 text-xs text-slate-300/75 grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.cashier_matrix.slice(0, 6).map((c) => (
              <p key={c.cashier_email}>{compactEmail(c.cashier_email)}: Rs {c.revenue.toFixed(0)} ({c.invoice_count} inv)</p>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold">Inventory Risk Block</h3>
          <p className="text-xs text-slate-300/70 mb-4">Low-stock and stockout intelligence with severity</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] text-slate-400 uppercase">Products</p>
              <p className="text-xl font-bold text-cyan-200 mt-1">{data.inventory_risk.total_products}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] text-slate-400 uppercase">Low Stock</p>
              <p className="text-xl font-bold text-yellow-200 mt-1">{data.inventory_risk.low_stock_count}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] text-slate-400 uppercase">Out of Stock</p>
              <p className="text-xl font-bold text-rose-200 mt-1">{data.inventory_risk.out_of_stock_count}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Risk Score</span>
              <span>{data.inventory_risk.risk_score.toFixed(1)} / 100</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-2 bg-linear-to-r from-emerald-400 via-yellow-400 to-rose-400" style={{ width: `${Math.min(100, data.inventory_risk.risk_score)}%` }} />
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {data.inventory_risk.likely_stockouts.slice(0, 10).map((p) => (
              <div key={p.id} className="rounded-lg border border-white/10 bg-white/5 p-2.5 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-slate-100">{p.name}</p>
                  <p className="text-[11px] text-slate-400">{p.sku} · stock {p.stock}</p>
                </div>
                <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full border ${severityClass(p.severity)}`}>
                  {p.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
