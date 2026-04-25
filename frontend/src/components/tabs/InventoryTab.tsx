"use client";

import { useEffect, useState } from "react";
import { FaBoxes, FaPlus, FaMinus, FaSync } from "react-icons/fa";
import { MdLocalPharmacy } from "react-icons/md";

const API = "http://localhost:8000";

const STOCK_THRESHOLDS = { critical: 5, low: 15 };

function stockStatus(qty: number) {
  if (qty <= STOCK_THRESHOLDS.critical)
    return { label: "Critical", color: "#ef4444", bg: "#fef2f2" };
  if (qty <= STOCK_THRESHOLDS.low)
    return { label: "Low", color: "#f59e0b", bg: "#fffbeb" };
  return { label: "OK", color: "#10b981", bg: "#f0fdf4" };
}

export default function InventoryTab() {
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  async function fetchInventory() {
    setLoading(true);
    const res = await fetch(`${API}/inventory`);
    const data = await res.json();
    setInventory(data.inventory["Dépôt Central Akwa"] ?? {});
    setLoading(false);
  }

  useEffect(() => {
    fetchInventory();
  }, []);

  const totalStock = Object.values(inventory).reduce((a, b) => a + b, 0);
  const criticalItems = Object.values(inventory).filter(
    (q) => q <= STOCK_THRESHOLDS.critical,
  ).length;
  const lowItems = Object.values(inventory).filter(
    (q) => q > STOCK_THRESHOLDS.critical && q <= STOCK_THRESHOLDS.low,
  ).length;

  return (
    <div
      className="h-full overflow-y-auto p-6"
      style={{ background: "#f0f4f8" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-slate-800 text-base">
            Dépôt Central Akwa
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Medical supply inventory
          </p>
        </div>
        <button
          onClick={fetchInventory}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "#e6fffa", color: "#0f766e" }}
        >
          <FaSync size={10} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Total Units",
            value: totalStock,
            color: "#14b8a6",
            bg: "#e6fffa",
          },
          {
            label: "Low Stock Items",
            value: lowItems,
            color: "#f59e0b",
            bg: "#fffbeb",
          },
          {
            label: "Critical Items",
            value: criticalItems,
            color: "#ef4444",
            bg: "#fef2f2",
          },
        ].map(({ label, value, color, bg }) => (
          <div
            key={label}
            className="rounded-2xl p-4"
            style={{
              background: "white",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <FaBoxes style={{ color, fontSize: 20 }} className="mb-2" />
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Stock table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "white",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <FaBoxes className="text-teal-500" />
          <h3 className="font-semibold text-slate-700 text-sm">Stock Levels</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Loading inventory…
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">
                  Medicine
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">
                  Quantity
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">
                  Stock bar
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(inventory).map(([med, qty], i) => {
                const { label, color, bg } = stockStatus(qty);
                const pct = Math.min((qty / 60) * 100, 100);
                return (
                  <tr
                    key={med}
                    className="border-t border-slate-50 hover:bg-slate-50 transition-colors"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <MdLocalPharmacy className="text-teal-400" />
                        <span className="text-sm font-medium text-slate-700">
                          {med}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-bold text-slate-800">
                        {qty}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">units</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{ background: bg, color }}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-3 w-40">
                      <div
                        className="w-full h-2 rounded-full"
                        style={{ background: "#f1f5f9" }}
                      >
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3 text-center">
        Stock replenishment and manual adjustments coming in next update.
      </p>
    </div>
  );
}
