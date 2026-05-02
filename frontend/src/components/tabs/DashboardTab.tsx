"use client";

import { useEffect, useState } from "react";
import {
  FaHospital,
  FaBoxes,
  FaRoute,
  FaBan,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { apiFetch } from "../auth/Api";

const DELIVERY_HISTORY = [
  { month: "Nov", deliveries: 18 },
  { month: "Dec", deliveries: 24 },
  { month: "Jan", deliveries: 31 },
  { month: "Feb", deliveries: 27 },
  { month: "Mar", deliveries: 38 },
  { month: "Apr", deliveries: 43 },
];

const MEDICINE_COLORS = [
  "#14b8a6",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#10b981",
];

export default function DashboardTab() {
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [nodeCount, setNodeCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/inventory").then((r) => r.json()),
      apiFetch("/nodes").then((r) => r.json()),
      apiFetch("/roads/blocked").then((r) => r.json()),
    ])
      .then(([inv, nodes, blocked]) => {
        setInventory(inv?.inventory?.["Dépôt Central Akwa"] ?? {});
        setNodeCount(
          (nodes?.nodes ?? []).filter((n: any) => n.type !== "depot").length,
        );
        setBlockedCount((blocked?.blocked ?? []).length);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalStock = Object.values(inventory).reduce((a, b) => a + b, 0);
  const lowStockCount = Object.values(inventory).filter((q) => q <= 10).length;

  const medicineChartData = Object.entries(inventory).map(([name, qty]) => ({
    name,
    value: qty,
  }));

  const stats = [
    {
      label: "Registered Facilities",
      value: loading ? "—" : nodeCount,
      icon: FaHospital,
      color: "#14b8a6",
      bg: "#e6fffa",
      trend: "+2 this month",
      up: true,
    },
    {
      label: "Total Stock Units",
      value: loading ? "—" : totalStock,
      icon: FaBoxes,
      color: "#f59e0b",
      bg: "#fffbeb",
      trend: `${lowStockCount} items low`,
      up: lowStockCount === 0,
    },
    {
      label: "Deliveries This Month",
      value: 43,
      icon: FaRoute,
      color: "#3b82f6",
      bg: "#eff6ff",
      trend: "+13% vs last month",
      up: true,
    },
    {
      label: "Blocked Roads",
      value: loading ? "—" : blockedCount,
      icon: FaBan,
      color: blockedCount > 0 ? "#ef4444" : "#10b981",
      bg: blockedCount > 0 ? "#fef2f2" : "#f0fdf4",
      trend: blockedCount > 0 ? "Affecting routes" : "All roads clear",
      up: blockedCount === 0,
    },
  ];

  return (
    <div
      className="h-full overflow-y-auto p-6"
      style={{ background: "#f0f4f8" }}
    >
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-5 mb-6 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, #0d3d3d 0%, #0f766e 100%)",
          boxShadow: "0 4px 20px rgba(13,61,61,0.3)",
        }}
      >
        <div>
          <h2 className="text-white font-bold text-lg">Welcome back 👋</h2>
          <p className="text-teal-200 text-sm mt-1">
            Douala medical supply network — {nodeCount} facilities monitored
          </p>
        </div>
        <div className="text-right">
          <p className="text-teal-300 text-xs">Today</p>
          <p className="text-white font-semibold text-sm">
            {new Date().toLocaleDateString("en-CM", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color, bg, trend, up }) => (
          <div
            key={label}
            className="rounded-2xl p-4"
            style={{
              background: "white",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: bg }}
              >
                <Icon style={{ color, fontSize: 18 }} />
              </div>
              <span
                className="text-xs flex items-center gap-1 font-medium"
                style={{ color: up ? "#10b981" : "#ef4444" }}
              >
                {up ? <FaArrowUp size={9} /> : <FaArrowDown size={9} />}
                {trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div
          className="xl:col-span-2 rounded-2xl p-5"
          style={{
            background: "white",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-700 text-sm">
                Delivery Trend
              </h3>
              <p className="text-xs text-slate-400">Last 6 months</p>
            </div>
            <span
              className="text-xs px-2 py-1 rounded-full font-medium"
              style={{ background: "#e6fffa", color: "#0f766e" }}
            >
              +13% ↑
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={DELIVERY_HISTORY}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ border: "none", borderRadius: 8, fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="deliveries"
                stroke="#14b8a6"
                strokeWidth={2.5}
                fill="url(#tealGrad)"
                dot={{ fill: "#14b8a6", r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{
            background: "white",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div className="mb-4">
            <h3 className="font-semibold text-slate-700 text-sm">
              Stock Distribution
            </h3>
            <p className="text-xs text-slate-400">By medicine type</p>
          </div>
          {medicineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={medicineChartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {medicineChartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={MEDICINE_COLORS[i % MEDICINE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    border: "none",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(val) => (
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {val}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-300 text-sm">
              {loading ? "Loading…" : "No stock data"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
