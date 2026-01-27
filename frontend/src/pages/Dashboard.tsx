import { useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type CustomerSegment = {
  customer_id: number;
  name: string;
  total_spent: number;
  total_invoices: number;
  segment: number;
};

export default function Dashboard() {
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loadingML, setLoadingML] = useState(false);

  const fetchMLInsights = async () => {
    setLoadingML(true);
    try {
      const res = await api.get<CustomerSegment[]>("/ml/customer-segments");
      setSegments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log(err);
      alert("Failed to fetch ML insights ❌");
      setSegments([]);
    }
    setLoadingML(false);
  };

  // ---------- KPIs ----------
  const vipCount = segments.filter((c) => c.segment === 1).length;
  const regularCount = segments.filter((c) => c.segment === 0).length;

  // ---------- CHART DATA ----------
  const segmentChartData = [
    { name: "VIP", value: vipCount },
    { name: "Regular", value: regularCount },
  ];

  const topSpenders = [...segments]
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5);

  const COLORS = ["#6366f1", "#27272a"];

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Overview</h2>

          <button
            onClick={fetchMLInsights}
            disabled={loadingML}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              loadingML
                ? "bg-zinc-800 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {loadingML ? "Refreshing..." : "Refresh ML Insights"}
          </button>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-sm text-zinc-400">VIP Customers</p>
            <p className="text-3xl font-bold text-green-400">
              {segments.length === 0 ? "-" : vipCount}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-sm text-zinc-400">Regular Customers</p>
            <p className="text-3xl font-bold text-zinc-200">
              {segments.length === 0 ? "-" : regularCount}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-sm text-zinc-400">Total Customers</p>
            <p className="text-3xl font-bold text-indigo-400">
              {segments.length === 0 ? "-" : segments.length}
            </p>
          </div>
        </div>

        {/* 📊 CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PIE CHART */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-lg font-semibold mb-4">
              Customer Segments
            </h3>

            {segments.length === 0 ? (
              <p className="text-zinc-500 text-sm">
                Load ML insights to view chart.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={segmentChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                  >
                    {segmentChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* BAR CHART */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-lg font-semibold mb-4">
              Top Customers by Spend
            </h3>

            {segments.length === 0 ? (
              <p className="text-zinc-500 text-sm">
                Load ML insights to view chart.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topSpenders}>
                  <XAxis dataKey="name" stroke="#a1a1aa" />
                  <YAxis stroke="#a1a1aa" />
                  <Tooltip />
                  <Bar
                    dataKey="total_spent"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* SEGMENT TABLE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-4">Customer Segments</h3>

          {segments.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              Click <strong>Refresh ML Insights</strong> to load data.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-800">
                    <th className="text-left py-2">Customer</th>
                    <th className="text-left py-2">Spent</th>
                    <th className="text-left py-2">Invoices</th>
                    <th className="text-left py-2">Segment</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((c) => (
                    <tr
                      key={c.customer_id}
                      className="border-b border-zinc-800"
                    >
                      <td className="py-2">{c.name}</td>
                      <td className="py-2">₹ {c.total_spent}</td>
                      <td className="py-2">{c.total_invoices}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs border ${
                            c.segment === 1
                              ? "bg-green-500/10 border-green-500/30 text-green-300"
                              : "bg-zinc-800 border-zinc-700 text-zinc-300"
                          }`}
                        >
                          {c.segment === 1 ? "VIP" : "Regular"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
