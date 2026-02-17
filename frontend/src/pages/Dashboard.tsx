import { useState, useEffect } from "react";
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
  segment: string; // ✅ NOW STRING
};

type TopProduct = {
  product_id: number;
  name: string;
  units_sold: number;
  revenue: number;
};

export default function Dashboard() {
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [segRes, prodRes] = await Promise.all([
          api.get<CustomerSegment[]>("/ml/customer-segments"),
          api.get<TopProduct[]>("/analytics/top-products"),
        ]);

        setSegments(Array.isArray(segRes.data) ? segRes.data : []);
        setTopProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      } catch (err) {
        console.error(err);
        alert("Failed to load dashboard data");
        setSegments([]);
        setTopProducts([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ✅ FIXED SEGMENT COUNTS
  const vipCount = segments.filter(
    (c) => c.segment === "VIP / High Value"
  ).length;

  const lowCount = segments.filter(
    (c) => c.segment === "Low Value"
  ).length;

  const segmentChartData = [
    { name: "VIP / High Value", value: vipCount },
    { name: "Low Value", value: lowCount },
  ];

  // ✅ FIXED TOP SPENDERS
  const topSpenders = [...segments]
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5);

  const COLORS = ["#22c55e", "#f59e0b"];

  if (loading) {
    return <p className="text-zinc-400">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Overview</h2>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm text-zinc-400">VIP Customers</p>
          <p className="text-3xl font-bold text-green-400">
            {vipCount}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm text-zinc-400">Low Value Customers</p>
          <p className="text-3xl font-bold text-yellow-400">
            {lowCount}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm text-zinc-400">Total Customers</p>
          <p className="text-3xl font-bold text-indigo-400">
            {segments.length}
          </p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PIE CHART */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-4">
            Customer Segments
          </h3>

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
        </div>

        {/* TOP CUSTOMERS */}
<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
  <h3 className="text-lg font-semibold mb-4">
    Top Customers by Spend
  </h3>

  <ResponsiveContainer width="100%" height={320}>
    <BarChart
      data={topSpenders}
      margin={{ top: 20, right: 20, left: 0, bottom: 40 }}
    >
      <XAxis
        dataKey="name"
        stroke="#a1a1aa"
        interval={0}
        tick={{ fontSize: 11 }}
      />
      <YAxis stroke="#a1a1aa" />
      <Tooltip />
      <Bar dataKey="total_spent" fill="#6366f1" radius={[6, 6, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</div>

        {/* TOP PRODUCTS */}
<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
  <h3 className="text-lg font-semibold mb-4">
    Top Products by Revenue
  </h3>

  <ResponsiveContainer width="100%" height={320}>
    <BarChart
      data={topProducts}
      margin={{ top: 20, right: 20, left: 0, bottom: 40 }}
    >
      <XAxis
        dataKey="name"
        stroke="#a1a1aa"
        interval={0}
        tick={{ fontSize: 11 }}
      />
      <YAxis stroke="#a1a1aa" />
      <Tooltip />
      <Bar dataKey="revenue" fill="#22c55e" radius={[6, 6, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</div>

      </div>
    </div>
  );
}
