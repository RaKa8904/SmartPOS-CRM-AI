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

  const compactLabel = (value: string) => {
    if (!value) return "";
    return value.length > 11 ? `${value.slice(0, 10)}..` : value;
  };

  if (loading) {
    return <p className="text-zinc-400">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="section-title text-gradient">Performance Overview</h2>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-5 fade-in">
          <p className="text-sm text-slate-300/80">VIP Customers</p>
          <p className="text-3xl font-bold text-green-400">
            {vipCount}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 fade-in stagger-1">
          <p className="text-sm text-slate-300/80">Low Value Customers</p>
          <p className="text-3xl font-bold text-yellow-400">
            {lowCount}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 fade-in stagger-2">
          <p className="text-sm text-slate-300/80">Total Customers</p>
          <p className="text-3xl font-bold text-cyan-300">
            {segments.length}
          </p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PIE CHART */}
        <div className="glass-card rounded-2xl p-5 fade-in">
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
<div className="glass-card rounded-2xl p-5 fade-in stagger-1">
  <h3 className="text-lg font-semibold mb-4">
    Top Customers by Spend
  </h3>

  <ResponsiveContainer width="100%" height={320}>
    <BarChart
      data={topSpenders}
      margin={{ top: 20, right: 20, left: 0, bottom: 72 }}
    >
      <XAxis
        dataKey="name"
        stroke="#9fb8e0"
        interval={0}
        tick={{ fontSize: 11 }}
        tickFormatter={compactLabel}
        angle={-18}
        textAnchor="end"
        height={66}
      />
      <YAxis stroke="#9fb8e0" />
      <Tooltip
        contentStyle={{
          background: "#131a38",
          border: "1px solid #3f57aa",
          borderRadius: "10px",
          color: "#dbe8ff",
        }}
      />
      <Bar dataKey="total_spent" fill="#00d0ff" radius={[8, 8, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</div>

        {/* TOP PRODUCTS */}
<div className="glass-card rounded-2xl p-5 fade-in stagger-2">
  <h3 className="text-lg font-semibold mb-4">
    Top Products by Revenue
  </h3>

  <ResponsiveContainer width="100%" height={320}>
    <BarChart
      data={topProducts}
      margin={{ top: 20, right: 20, left: 0, bottom: 72 }}
    >
      <XAxis
        dataKey="name"
        stroke="#9fb8e0"
        interval={0}
        tick={{ fontSize: 11 }}
        tickFormatter={compactLabel}
        angle={-18}
        textAnchor="end"
        height={66}
      />
      <YAxis stroke="#9fb8e0" />
      <Tooltip
        contentStyle={{
          background: "#131a38",
          border: "1px solid #3f57aa",
          borderRadius: "10px",
          color: "#dbe8ff",
        }}
        formatter={(value) => [`Rs ${Number(value ?? 0).toFixed(2)}`, "Revenue"]}
      />
      <Bar dataKey="revenue" fill="#20d46f" radius={[8, 8, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</div>

      </div>
    </div>
  );
}
