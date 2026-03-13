import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Treemap,
  Tooltip,
} from "recharts";

import { api } from "../api";

type CashierCount = {
  cashier_email: string;
  invoices_count: number;
};

type StaffBilling = {
  cashier_email: string;
  total_billing: number;
  invoices_count: number;
};

type AccountChange = {
  id: number;
  actor_email: string;
  action: string;
  target_email: string | null;
  created_at: string | null;
  details: Record<string, unknown>;
};

type ActivitySummary = {
  active_users_today: number;
  failed_login_attempts_today: number;
  invoices_per_cashier: CashierCount[];
  top_staff_by_billing: StaffBilling[];
  recent_account_changes: AccountChange[];
};

const ACTION_LABELS: Record<string, string> = {
  user_role_changed: "Role changed",
  user_status_changed: "Status changed",
  user_session_revoked: "Session revoked",
  user_username_changed: "Username changed",
};

function compactEmail(value: string): string {
  if (!value) return "unknown";
  return value.length > 20 ? `${value.slice(0, 18)}..` : value;
}

function fmtDate(value: string | null): string {
  if (!value) return "-";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "-" : dt.toLocaleString();
}

export default function UserActivity() {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<ActivitySummary>("/user-activity/summary");
        setSummary(res.data);
      } catch (err) {
        console.error(err);
        alert("Failed to load user activity dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const perCashierChart = useMemo(
    () =>
      (summary?.invoices_per_cashier ?? [])
        .slice(0, 8)
        .map((row) => ({
          ...row,
          cashier_short: compactEmail(row.cashier_email),
        })),
    [summary]
  );

  const topBillingChart = useMemo(
    () =>
      (summary?.top_staff_by_billing ?? []).map((row) => ({
        ...row,
        cashier_short: compactEmail(row.cashier_email),
      })),
    [summary]
  );

  const totalInvoices = useMemo(
    () => perCashierChart.reduce((acc, row) => acc + row.invoices_count, 0),
    [perCashierChart]
  );

  const invoicesShareData = useMemo(
    () =>
      perCashierChart.map((row, idx) => ({
        name: row.cashier_short,
        full_name: row.cashier_email,
        value: row.invoices_count,
        fill: ["#22d3ee", "#38bdf8", "#60a5fa", "#818cf8", "#2dd4bf", "#0ea5e9", "#4ade80", "#34d399"][idx % 8],
      })),
    [perCashierChart]
  );

  const billingTreemap = useMemo(
    () =>
      topBillingChart.map((row, idx) => ({
        name: row.cashier_short,
        full_name: row.cashier_email,
        size: row.total_billing,
        invoices: row.invoices_count,
        fill: ["#16a34a", "#22c55e", "#10b981", "#14b8a6", "#06b6d4"][idx % 5],
      })),
    [topBillingChart]
  );

  const renderTreemapContent = (props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    fill?: string;
    index?: number;
  }) => {
    const { x = 0, y = 0, width = 0, height = 0, name = "", fill = "#0ea5e9" } = props;
    if (width < 40 || height < 28) return <g />;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} rx={8} ry={8} fill={fill} fillOpacity={0.85} stroke="#0b1029" strokeWidth={2} />
        <text x={x + 8} y={y + 18} fill="#eef7ff" fontSize={11} fontWeight={700}>
          {name}
        </text>
      </g>
    );
  };

  if (loading) return <p className="text-zinc-400">Loading activity metrics...</p>;
  if (!summary) return <p className="text-red-300">Could not load activity dashboard.</p>;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 fade-in">
        <h2 className="section-title text-gradient mb-1">User Activity Dashboard</h2>
        <p className="text-sm text-slate-300/80">
          Operational monitoring for team usage, billing performance, and account-level changes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 fade-in">
          <p className="text-xs uppercase tracking-wide text-slate-300/70">Active Users Today</p>
          <p className="text-3xl font-bold text-cyan-300 mt-2">{summary.active_users_today}</p>
        </div>

        <div className="glass-card rounded-2xl p-5 fade-in stagger-1">
          <p className="text-xs uppercase tracking-wide text-slate-300/70">Failed Logins Today</p>
          <p className="text-3xl font-bold text-rose-300 mt-2">{summary.failed_login_attempts_today}</p>
        </div>

        <div className="glass-card rounded-2xl p-5 fade-in stagger-2">
          <p className="text-xs uppercase tracking-wide text-slate-300/70">Cashiers Tracked</p>
          <p className="text-3xl font-bold text-emerald-300 mt-2">{summary.invoices_per_cashier.length}</p>
        </div>

        <div className="glass-card rounded-2xl p-5 fade-in stagger-3">
          <p className="text-xs uppercase tracking-wide text-slate-300/70">Recent Account Changes</p>
          <p className="text-3xl font-bold text-violet-300 mt-2">{summary.recent_account_changes.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5 fade-in">
          <h3 className="text-lg font-semibold mb-1">Invoices Share by Cashier</h3>
          <p className="text-xs text-slate-300/70 mb-4">Radial split of invoice contribution</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "#131a38",
                  border: "1px solid #3f57aa",
                  borderRadius: "10px",
                  color: "#dbe8ff",
                }}
                formatter={(value, _name, item) => {
                  const row = item.payload as { full_name: string };
                  const numericValue = Number(value ?? 0);
                  const pct = totalInvoices > 0 ? ((numericValue / totalInvoices) * 100).toFixed(1) : "0.0";
                  return [`${numericValue} invoices (${pct}%)`, row.full_name];
                }}
              />
              <Pie
                data={invoicesShareData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={66}
                outerRadius={108}
                paddingAngle={2}
                stroke="#0e1538"
                strokeWidth={2}
              >
                {invoicesShareData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-5 fade-in stagger-1">
          <h3 className="text-lg font-semibold mb-1">Top Staff Billing Footprint</h3>
          <p className="text-xs text-slate-300/70 mb-4">Treemap view sized by total billing</p>
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={billingTreemap}
              dataKey="size"
              nameKey="name"
              stroke="#0e1538"
              fill="#22c55e"
              content={renderTreemapContent}
            >
              <Tooltip
                contentStyle={{
                  background: "#131a38",
                  border: "1px solid #3f57aa",
                  borderRadius: "10px",
                  color: "#dbe8ff",
                }}
                formatter={(value, _name, item) => {
                  const row = item.payload as { full_name: string; invoices: number };
                  return [`Rs ${Number(value ?? 0).toFixed(2)} (${row.invoices} invoices)`, row.full_name];
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 fade-in stagger-2">
        <h3 className="text-lg font-semibold mb-4">Recent Account Changes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-180">
            <thead className="bg-[#1b214a]/70 text-slate-300/80">
              <tr>
                <th className="text-left px-3 py-2.5">Time</th>
                <th className="text-left px-3 py-2.5">Action</th>
                <th className="text-left px-3 py-2.5">Actor</th>
                <th className="text-left px-3 py-2.5">Target</th>
                <th className="text-left px-3 py-2.5">Change</th>
              </tr>
            </thead>
            <tbody>
              {summary.recent_account_changes.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-400" colSpan={5}>No account changes logged yet.</td>
                </tr>
              ) : (
                summary.recent_account_changes.map((row) => {
                  const oldRole = row.details?.old_role;
                  const newRole = row.details?.new_role;
                  const oldStatus = row.details?.old_is_active;
                  const newStatus = row.details?.new_is_active;
                  const oldName = row.details?.old_username;
                  const newName = row.details?.new_username;

                  let changeText = "-";
                  if (oldRole !== undefined || newRole !== undefined) {
                    changeText = `${String(oldRole)} -> ${String(newRole)}`;
                  } else if (oldStatus !== undefined || newStatus !== undefined) {
                    changeText = `${oldStatus ? "Active" : "Disabled"} -> ${newStatus ? "Active" : "Disabled"}`;
                  } else if (oldName !== undefined || newName !== undefined) {
                    changeText = `${String(oldName)} -> ${String(newName)}`;
                  }

                  return (
                    <tr key={row.id} className="border-t border-[#33437f]/25 odd:bg-[#11204b]/25">
                      <td className="px-3 py-2.5 text-slate-300">{fmtDate(row.created_at)}</td>
                      <td className="px-3 py-2.5 text-cyan-200">{ACTION_LABELS[row.action] ?? row.action}</td>
                      <td className="px-3 py-2.5 text-slate-300">{row.actor_email}</td>
                      <td className="px-3 py-2.5 text-slate-300">{row.target_email ?? "-"}</td>
                      <td className="px-3 py-2.5 text-slate-200">{changeText}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
