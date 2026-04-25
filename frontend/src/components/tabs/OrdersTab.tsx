"use client";

import { useEffect, useState } from "react";
import {
  FaPlus,
  FaBolt,
  FaCheckCircle,
  FaTimesCircle,
  FaInbox,
  FaRoad,
} from "react-icons/fa";
import { DispatchEntry } from "../AppShell";

const API = "http://localhost:8000";

interface Props {
  history: DispatchEntry[];
  onQueue: (entry: DispatchEntry) => void;
  onDispatch: (coords: number[][], entry: DispatchEntry) => void;
}

const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  border: "1.5px solid #e2e8f0",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 13,
  color: "#1e293b", // ← dark text always visible
  background: "#f8fafc",
  outline: "none",
  appearance: "auto",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  border: "1.5px solid #e2e8f0",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 13,
  color: "#1e293b", // ← dark text always visible
  background: "#f8fafc",
  outline: "none",
};

export default function OrdersTab({ history, onQueue, onDispatch }: Props) {
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [facilities, setFacilities] = useState<any[]>([]);
  const [facility, setFacility] = useState("");
  const [medicine, setMedicine] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState(1);
  const [result, setResult] = useState<DispatchEntry | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/inventory`)
      .then((r) => r.json())
      .then((data) => {
        const depot = data.inventory["Dépôt Central Akwa"] ?? {};
        setInventory(depot);
        const meds = Object.keys(depot);
        if (meds.length > 0) setMedicine(meds[0]);
      });
    fetch(`${API}/nodes`)
      .then((r) => r.json())
      .then((data) => {
        const f = data.nodes.filter((n: any) => n.type !== "depot");
        setFacilities(f);
        if (f.length > 0) setFacility(f[0].name);
      });
  }, []);

  // refresh inventory after each dispatch so stock stays current
  async function refreshInventory() {
    const data = await fetch(`${API}/inventory`).then((r) => r.json());
    setInventory(data.inventory["Dépôt Central Akwa"] ?? {});
  }

  async function createRequest() {
    if (!facility || !medicine) return;
    setLoading(true);
    try {
      // queue `quantity` separate requests (one per unit — matches backend model)
      for (let i = 0; i < quantity; i++) {
        await fetch(
          `${API}/request?facility=${encodeURIComponent(facility)}&medicine=${encodeURIComponent(medicine)}&priority=${priority}`,
          { method: "POST" },
        );
      }
      const entry: DispatchEntry = {
        status: "QUEUED",
        request: `${facility} needs ${quantity}× ${medicine} (priority ${priority})`,
        time: new Date().toLocaleTimeString(),
      };
      setResult(entry);
      onQueue(entry);
    } catch {
      setResult({
        status: "FAILED",
        reason: "Could not connect to backend",
        time: new Date().toLocaleTimeString(),
      });
    } finally {
      setLoading(false);
    }
  }

  async function processRequest() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/process`);
      const data = await res.json();
      const entry: DispatchEntry = {
        ...data,
        time: new Date().toLocaleTimeString(),
      };

      setResult(entry);
      await refreshInventory();

      if (data.route?.coords && data.route.coords.length > 0) {
        // switch to map tab and animate — handled in AppShell
        onDispatch(data.route.coords, entry);
      } else {
        onQueue(entry);
      }
    } catch {
      const entry: DispatchEntry = {
        status: "FAILED",
        reason: "Could not connect to backend",
        time: new Date().toLocaleTimeString(),
      };
      setResult(entry);
      onQueue(entry);
    } finally {
      setLoading(false);
    }
  }

  const maxQty = medicine ? (inventory[medicine] ?? 1) : 1;

  const statusStyle = (s: string) =>
    s === "APPROVED"
      ? { bg: "#f0fdf4", color: "#16a34a", icon: <FaCheckCircle /> }
      : s === "FAILED"
        ? { bg: "#fef2f2", color: "#dc2626", icon: <FaTimesCircle /> }
        : s === "QUEUED"
          ? { bg: "#eff6ff", color: "#2563eb", icon: <FaInbox /> }
          : { bg: "#f8fafc", color: "#64748b", icon: <FaInbox /> };

  return (
    <div
      className="h-full overflow-y-auto p-6"
      style={{ background: "#f0f4f8" }}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Request form ────────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "white",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          {/* Card header */}
          <div
            className="px-5 py-4 border-b border-slate-100"
            style={{ background: "linear-gradient(135deg, #0d3d3d, #0f766e)" }}
          >
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FaPlus /> New Supply Request
            </h3>
            <p className="text-teal-200 text-xs mt-0.5">
              Submit a delivery request from the depot
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Facility */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Destination Facility
              </label>
              <select
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                style={SELECT_STYLE}
              >
                <option value="">Select facility…</option>
                {facilities.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Medicine */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Medicine
              </label>
              <select
                value={medicine}
                onChange={(e) => {
                  setMedicine(e.target.value);
                  setQuantity(1);
                }}
                style={SELECT_STYLE}
              >
                {Object.entries(inventory).map(([med, qty]) => (
                  <option key={med} value={med} disabled={qty === 0}>
                    {med} {qty === 0 ? "(out of stock)" : `(${qty} available)`}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Quantity Needed
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={maxQty}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.min(Number(e.target.value), maxQty))
                  }
                  style={{ ...INPUT_STYLE, width: 100 }}
                />
                <span className="text-xs text-slate-500">
                  Max available: <b className="text-slate-700">{maxQty}</b>
                </span>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Priority Level
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((p) => {
                  const active = priority === p;
                  const col =
                    p <= 2
                      ? { active: "#ef4444", bg: "#fef2f2" }
                      : p === 3
                        ? { active: "#f59e0b", bg: "#fffbeb" }
                        : { active: "#10b981", bg: "#f0fdf4" };
                  return (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: active ? col.bg : "#f8fafc",
                        color: active ? col.active : "#94a3b8",
                        border: active
                          ? `1.5px solid ${col.active}`
                          : "1.5px solid #e2e8f0",
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                1 = highest priority · 5 = lowest
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={createRequest}
                disabled={loading || !facility || quantity < 1}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                style={{
                  background: "linear-gradient(135deg, #0d3d3d, #14b8a6)",
                }}
              >
                <FaInbox size={13} />
                {loading ? "Adding…" : "Queue Request"}
              </button>
              <button
                onClick={processRequest}
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                style={{
                  background: "linear-gradient(135deg, #16a34a, #22c55e)",
                }}
              >
                <FaBolt size={13} />
                {loading ? "Dispatching…" : "Dispatch Next"}
              </button>
            </div>
          </div>

          {/* Latest result */}
          {result &&
            (() => {
              const { bg, color, icon } = statusStyle(result.status);
              return (
                <div
                  className="mx-5 mb-5 rounded-xl p-3"
                  style={{ background: bg }}
                >
                  <p
                    className="font-semibold text-sm flex items-center gap-2"
                    style={{ color }}
                  >
                    {icon}
                    {result.status === "APPROVED"
                      ? "Dispatched — switching to map…"
                      : result.status === "FAILED"
                        ? "Request failed"
                        : result.status === "QUEUED"
                          ? "Request queued"
                          : (result.message ?? result.status)}
                  </p>
                  {result.request && (
                    <p className="text-xs mt-1 opacity-75">{result.request}</p>
                  )}
                  {result.reason && (
                    <p className="text-xs mt-1 opacity-75">↳ {result.reason}</p>
                  )}
                  {result.remaining_stock !== undefined && (
                    <p className="text-xs mt-1 opacity-75">
                      Remaining stock: <b>{result.remaining_stock}</b>
                    </p>
                  )}
                </div>
              );
            })()}
        </div>

        {/* ── Dispatch history ─────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "white",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <FaRoad className="text-teal-500" />
              Dispatch History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {history.length} entr{history.length === 1 ? "y" : "ies"} this
              session
            </p>
          </div>

          <div
            className="divide-y divide-slate-50 overflow-y-auto"
            style={{ maxHeight: 420 }}
          >
            {history.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                No dispatches yet this session.
              </div>
            )}
            {history.map((h, i) => {
              const { bg, color, icon } = statusStyle(h.status);
              return (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: bg, color }}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {h.status === "APPROVED"
                        ? "✅ Dispatched"
                        : h.status === "FAILED"
                          ? "❌ Failed"
                          : h.status === "QUEUED"
                            ? "📥 Queued"
                            : (h.message ?? h.status)}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {h.request ?? h.reason ?? ""}
                    </p>
                    {h.route?.path && (
                      <p className="text-xs text-teal-600 truncate mt-0.5">
                        {h.route.path.join(" → ")}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {h.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
