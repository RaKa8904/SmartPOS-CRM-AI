import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

  const billingComparison = useMemo(
    () =>
      topBillingChart.map((row) => ({
        cashier_short: row.cashier_short,
        cashier_email: row.cashier_email,
        total_billing: Number(row.total_billing.toFixed(2)),
        invoices_count: row.invoices_count,
      })),
    [topBillingChart]
  );

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
          <h3 className="text-lg font-semibold mb-1">Invoices Created Per Cashier</h3>
          <p className="text-xs text-slate-300/70 mb-4">Ranked horizontal bars with exact counts</p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={perCashierChart}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 12, bottom: 4 }}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#213063" opacity={0.5} />
              <XAxis type="number" stroke="#9fb8e0" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="cashier_short"
                width={130}
                stroke="#9fb8e0"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#131a38",
                  border: "1px solid #3f57aa",
                  borderRadius: "10px",
                  color: "#dbe8ff",
                }}
                formatter={(value, _name, item) => {
                  const row = item.payload as { cashier_email: string };
                  return [`${Number(value ?? 0)} invoices`, row.cashier_email];
                }}
              />
              <Bar dataKey="invoices_count" radius={[0, 10, 10, 0]} fill="#2dd4bf" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-5 fade-in stagger-1">
          <h3 className="text-lg font-semibold mb-1">Top Staff Billing Volume</h3>
          <p className="text-xs text-slate-300/70 mb-4">Area + line comparison of revenue and invoice count</p>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={billingComparison} margin={{ top: 8, right: 16, left: 4, bottom: 50 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#213063" opacity={0.5} />
              <XAxis
                dataKey="cashier_short"
                stroke="#9fb8e0"
                interval={0}
                angle={-18}
                textAnchor="end"
                height={52}
                tick={{ fontSize: 11 }}
              />
              <YAxis yAxisId="left" stroke="#9fb8e0" tickFormatter={(v) => `Rs ${v}`} />
              <YAxis yAxisId="right" orientation="right" stroke="#d7b9ff" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#131a38",
                  border: "1px solid #3f57aa",
                  borderRadius: "10px",
                  color: "#dbe8ff",
                }}
                formatter={(value, _name, item) => {
                  const row = item.payload as { cashier_email: string; invoices_count: number };
                  if (item.dataKey === "total_billing") {
                    return [`Rs ${Number(value ?? 0).toFixed(2)}`, `${row.cashier_email} (Billing)`];
                  }
                  return [`${Number(value ?? 0)} invoices`, `${row.cashier_email} (Invoices)`];
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="total_billing"
                name="Billing Amount"
                fill="#22c55e"
                fillOpacity={0.35}
                stroke="#4ade80"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="invoices_count"
                name="Invoice Count"
                stroke="#c084fc"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "#0f1434" }}
              />
            </ComposedChart>
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
