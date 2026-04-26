"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FaPlus,
  FaBolt,
  FaCheckCircle,
  FaInbox,
  FaRoad,
  FaTrash,
  FaSync,
} from "react-icons/fa";
import { DispatchEntry } from "../AppShell";

const API = "http://localhost:8000";

interface QueuedRequest {
  index: number;
  facility: string;
  medicine: string;
  priority: number;
  quantity: number;
}

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
  color: "#1e293b",
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
  color: "#1e293b",
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
  const [requests, setRequests] = useState<QueuedRequest[]>([]);
  const [totalUnits, setTotalUnits] = useState(0);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
  const [hiddenHistory, setHiddenHistory] = useState<Set<number>>(new Set());

  // ── Load static data ───────────────────────────────────────────────────────
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

  // ── Poll queue every 2s ────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`${API}/requests`);
      const data = await res.json();
      setRequests(data.requests ?? []);
      setTotalUnits(data.total_units ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 2000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  async function refreshInventory() {
    const data = await fetch(`${API}/inventory`).then((r) => r.json());
    setInventory(data.inventory["Dépôt Central Akwa"] ?? {});
  }

  // ── Queue one order (with full quantity) ───────────────────────────────────
  async function createRequest() {
    if (!facility || !medicine) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/request?facility=${encodeURIComponent(facility)}&medicine=${encodeURIComponent(medicine)}&priority=${priority}&quantity=${quantity}`,
        { method: "POST" },
      );
      const data = await res.json();

      if (!res.ok) {
        setResult({
          status: "FAILED",
          reason: data.detail,
          time: new Date().toLocaleTimeString(),
        });
      } else {
        setResult({
          status: "QUEUED",
          request: `${facility} — ${quantity}× ${medicine} (priority ${priority})`,
          time: new Date().toLocaleTimeString(),
        });
        fetchQueue();
      }
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

  // ── Dispatch next order (full quantity at once) ────────────────────────────
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
      fetchQueue();

      if (data.status === "APPROVED") {
        if (data.route?.coords?.length > 0) {
          onDispatch(data.route.coords, entry);
        } else {
          onQueue(entry);
        }
      }
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

  // ── Cancel a queued order ──────────────────────────────────────────────────
  async function cancelRequest(index: number) {
    setDeletingIdx(index);
    try {
      await fetch(`${API}/request/${index}`, { method: "DELETE" });
      fetchQueue();
    } finally {
      setDeletingIdx(null);
    }
  }

  // ── History helpers ────────────────────────────────────────────────────────
  const dispatchedHistory = history
    .map((h, i) => ({ ...h, originalIndex: i }))
    .filter(
      (h) => h.status === "APPROVED" && !hiddenHistory.has(h.originalIndex),
    );

  function removeFromHistory(idx: number) {
    setHiddenHistory((s) => new Set([...s, idx]));
  }

  const maxQty = medicine ? (inventory[medicine] ?? 1) : 1;

  const priorityColor = (p: number) =>
    p <= 2 ? "#ef4444" : p === 3 ? "#f59e0b" : "#10b981";

  return (
    <div
      className="h-full overflow-y-auto p-6"
      style={{ background: "#f0f4f8" }}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Request form ─────────────────────────────────────────────── */}
        <div
          className="xl:col-span-1 rounded-2xl overflow-hidden"
          style={{
            background: "white",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div
            className="px-5 py-4 border-b border-slate-100"
            style={{ background: "linear-gradient(135deg, #0d3d3d, #0f766e)" }}
          >
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FaPlus /> New Supply Request
            </h3>
            <p className="text-teal-200 text-xs mt-0.5">
              Full order dispatched in one delivery
            </p>
          </div>

          <div className="p-5 space-y-4">
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

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={maxQty}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.min(Math.max(1, Number(e.target.value)), maxQty),
                    )
                  }
                  style={{ ...INPUT_STYLE, width: 90 }}
                />
                <span className="text-xs text-slate-500">
                  Max available: <b className="text-slate-700">{maxQty}</b>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Priority Level
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((p) => {
                  const col =
                    p <= 2
                      ? { a: "#ef4444", bg: "#fef2f2" }
                      : p === 3
                        ? { a: "#f59e0b", bg: "#fffbeb" }
                        : { a: "#10b981", bg: "#f0fdf4" };
                  return (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: priority === p ? col.bg : "#f8fafc",
                        color: priority === p ? col.a : "#94a3b8",
                        border:
                          priority === p
                            ? `1.5px solid ${col.a}`
                            : "1.5px solid #e2e8f0",
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                1 = highest · 5 = lowest
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={createRequest}
                disabled={loading || !facility}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #0d3d3d, #14b8a6)",
                }}
              >
                <FaInbox size={13} />
                {loading ? "Adding…" : "Queue Request"}
              </button>
              <button
                onClick={processRequest}
                disabled={loading || requests.length === 0}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #16a34a, #22c55e)",
                }}
              >
                <FaBolt size={13} />
                {loading ? "…" : "Dispatch Next"}
              </button>
            </div>
          </div>

          {/* Result card */}
          {result && (
            <div
              className="mx-5 mb-5 rounded-xl p-3"
              style={{
                background:
                  result.status === "APPROVED"
                    ? "#f0fdf4"
                    : result.status === "FAILED"
                      ? "#fef2f2"
                      : "#eff6ff",
              }}
            >
              <p
                className="font-semibold text-sm flex items-center gap-2"
                style={{
                  color:
                    result.status === "APPROVED"
                      ? "#16a34a"
                      : result.status === "FAILED"
                        ? "#dc2626"
                        : "#2563eb",
                }}
              >
                {result.status === "APPROVED" ? <FaCheckCircle /> : <FaInbox />}
                {result.status === "APPROVED"
                  ? "Dispatched — switching to map…"
                  : result.status === "FAILED"
                    ? "Failed"
                    : "Request queued"}
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
          )}
        </div>

        {/* ── Right column ──────────────────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* Pending queue */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "white",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <FaInbox className="text-blue-400" />
                  Pending Queue
                  {requests.length > 0 && (
                    <span
                      className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: "#eff6ff", color: "#2563eb" }}
                    >
                      {requests.length} order{requests.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {totalUnits} total unit{totalUnits !== 1 ? "s" : ""} awaiting
                  dispatch
                </p>
              </div>
              <button
                onClick={fetchQueue}
                className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: "#f0fdf4", color: "#16a34a" }}
              >
                <FaSync size={9} /> Refresh
              </button>
            </div>

            <div className="divide-y divide-slate-50">
              {requests.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  Queue is empty — add a request above.
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.index}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  >
                    {/* Priority badge */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{ background: priorityColor(req.priority) }}
                    >
                      {req.priority}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">
                        {req.facility}
                      </p>
                      <p className="text-xs text-slate-500">
                        {req.quantity}× {req.medicine}
                      </p>
                    </div>

                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ background: "#eff6ff", color: "#2563eb" }}
                    >
                      Queued
                    </span>

                    <button
                      onClick={() => cancelRequest(req.index)}
                      disabled={deletingIdx === req.index}
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
                      style={{ background: "#fef2f2", color: "#ef4444" }}
                      title="Cancel this order"
                    >
                      {deletingIdx === req.index ? (
                        <FaSync size={10} className="animate-spin" />
                      ) : (
                        <FaTrash size={10} />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dispatch history — APPROVED only */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "white",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <FaRoad className="text-teal-500" />
                  Dispatch History
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {dispatchedHistory.length} completed dispatch
                  {dispatchedHistory.length !== 1 ? "es" : ""} this session
                </p>
              </div>
              {dispatchedHistory.length > 0 && (
                <button
                  onClick={() =>
                    setHiddenHistory(new Set(history.map((_, i) => i)))
                  }
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: "#fef2f2", color: "#ef4444" }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div
              className="divide-y divide-slate-50 overflow-y-auto"
              style={{ maxHeight: 320 }}
            >
              {dispatchedHistory.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  No completed dispatches yet this session.
                </div>
              ) : (
                dispatchedHistory.map((h) => (
                  <div
                    key={h.originalIndex}
                    className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "#f0fdf4", color: "#16a34a" }}
                    >
                      <FaCheckCircle size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">
                        Dispatched
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {h.request}
                      </p>
                      {h.route?.path && (
                        <p className="text-xs text-teal-600 truncate mt-0.5">
                          {h.route.path.join(" → ")}
                        </p>
                      )}
                      {h.remaining_stock !== undefined && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Remaining stock: <b>{h.remaining_stock}</b>
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {h.time}
                    </span>
                    <button
                      onClick={() => removeFromHistory(h.originalIndex)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "#fef2f2", color: "#ef4444" }}
                      title="Remove from history"
                    >
                      <FaTrash size={9} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
