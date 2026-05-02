"use client";

import { useEffect, useState } from "react";
import {
  FaBoxes,
  FaSync,
  FaPlus,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPen,
} from "react-icons/fa";
import { MdLocalPharmacy } from "react-icons/md";
import { apiFetch, apiPost } from "../auth/Api";
import { useAuth } from "../auth/Authcontext";

const STOCK_THRESHOLDS = { critical: 5, low: 15 };
const NEW_MEDICINE_KEY = "__new__";

function stockStatus(qty: number) {
  if (qty <= STOCK_THRESHOLDS.critical)
    return { label: "Critical", color: "#ef4444", bg: "#fef2f2" };
  if (qty <= STOCK_THRESHOLDS.low)
    return { label: "Low", color: "#f59e0b", bg: "#fffbeb" };
  return { label: "OK", color: "#10b981", bg: "#f0fdf4" };
}

export default function InventoryTab() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("manage_inventory");

  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selMedicine, setSelMedicine] = useState(""); // dropdown value
  const [customName, setCustomName] = useState(""); // typed when NEW_MEDICINE_KEY selected
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);

  async function fetchInventory(silent = false) {
    if (!silent) setLoading(true); // ← only show spinner on manual refresh
    try {
      const res = await apiFetch("/inventory");
      const data = await res.json();
      const depot = data?.inventory?.["Dépôt Central Akwa"] ?? {};
      setInventory(depot);
      const meds = Object.keys(depot);
      if (meds.length > 0 && !selMedicine) setSelMedicine(meds[0]);
    } catch {}
    if (!silent) setLoading(false);
  }

  useEffect(() => {
    fetchInventory();
    const id = setInterval(() => {
      if (!modalOpen) fetchInventory(true);
    }, 8000);
    return () => clearInterval(id);
  }, [modalOpen]); // ← re-register when modalOpen changes

  function openModal(preselect?: string) {
    setSelMedicine(preselect ?? Object.keys(inventory)[0] ?? "");
    setCustomName("");
    setQuantity(1);
    setFeedback(null);
    setModalOpen(true);
  }

  // Derived values
  const isNew = selMedicine === NEW_MEDICINE_KEY;
  const medicine = isNew ? customName.trim() : selMedicine;
  const medicines = Object.keys(inventory);
  const currentQty = !isNew ? (inventory[medicine] ?? 0) : null;

  async function handleRestock() {
    if (!medicine) {
      setFeedback({ text: "Please enter a medicine name", ok: false });
      return;
    }
    if (quantity < 1) {
      setFeedback({ text: "Quantity must be at least 1", ok: false });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await apiPost("/inventory/restock", {
        medicine,
        quantity,
        is_new: isNew,
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ text: data.detail ?? "Failed", ok: false });
      } else {
        setFeedback({ text: data.message, ok: true });
        await fetchInventory();
        setTimeout(() => {
          setModalOpen(false);
          setFeedback(null);
        }, 1800);
      }
    } catch {
      setFeedback({ text: "Could not connect to backend", ok: false });
    } finally {
      setSubmitting(false);
    }
  }

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
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #0d3d3d, #14b8a6)",
              }}
            >
              <FaPlus size={10} /> Restock / Add Medicine
            </button>
          )}
          <button
            onClick={fetchInventory}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: "#e6fffa", color: "#0f766e" }}
          >
            <FaSync size={10} className={loading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
        </div>
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaBoxes className="text-teal-500" />
            <h3 className="font-semibold text-slate-700 text-sm">
              Stock Levels
            </h3>
          </div>
          {!canManage && (
            <span className="text-xs text-slate-400 italic">
              View only — admin required to restock
            </span>
          )}
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
                {canManage && <th className="px-5 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {Object.entries(inventory).map(([med, qty]) => {
                const { label, color, bg } = stockStatus(qty);
                const pct = Math.min((qty / 60) * 100, 100);
                return (
                  <tr
                    key={med}
                    className="border-t border-slate-50 hover:bg-slate-50 transition-colors"
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
                    {canManage && (
                      <td className="px-5 py-3">
                        <button
                          onClick={() => openModal(med)}
                          className="text-xs px-2 py-1 rounded-lg font-medium"
                          style={{ background: "#e6fffa", color: "#0f766e" }}
                        >
                          <FaPlus size={9} className="inline mr-1" />
                          Restock
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: "white",
              boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
            }}
          >
            {/* Header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{
                background: "linear-gradient(135deg, #0d3d3d, #0f766e)",
              }}
            >
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <FaPlus size={12} />
                  {isNew ? "Add New Medicine" : "Restock Medicine"}
                </h3>
                <p className="text-teal-200 text-xs mt-0.5">
                  {isNew
                    ? "Add a new medicine type to the depot"
                    : "Increase stock of an existing medicine"}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20"
              >
                <FaTimes className="text-white" size={13} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Smart dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Medicine
                </label>
                <select
                  value={selMedicine}
                  onChange={(e) => {
                    setSelMedicine(e.target.value);
                    setCustomName("");
                    setFeedback(null);
                  }}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none"
                  style={{
                    color: "#1e293b",
                    background: "#f8fafc",
                    appearance: "auto",
                  }}
                >
                  <option value="" disabled>
                    Select medicine…
                  </option>
                  {medicines.map((m) => (
                    <option key={m} value={m}>
                      {m} — {inventory[m]} units in stock
                    </option>
                  ))}
                  {/* Divider */}
                  <option disabled>──────────────</option>
                  <option value={NEW_MEDICINE_KEY}>
                    ✏️ Add a new medicine type…
                  </option>
                </select>
              </div>

              {/* Custom name input — only shown when "Add new" is selected */}
              {isNew && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    New Medicine Name
                  </label>
                  <div className="relative">
                    <FaPen
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                      size={12}
                    />
                    <input
                      type="text"
                      placeholder="e.g. Morphine, Insulin, Aspirin…"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      autoFocus
                      className="w-full border border-slate-200 rounded-xl p-3 pl-9 text-sm outline-none focus:border-teal-400"
                      style={{ color: "#1e293b", background: "#f8fafc" }}
                    />
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Quantity to Add
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold"
                    style={{ background: "#f1f5f9", color: "#64748b" }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, Number(e.target.value)))
                    }
                    className="flex-1 text-center border border-slate-200 rounded-xl p-3 text-lg font-bold outline-none"
                    style={{ color: "#1e293b", background: "#f8fafc" }}
                  />
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold"
                    style={{ background: "#f1f5f9", color: "#64748b" }}
                  >
                    +
                  </button>
                </div>
                {/* Quick buttons */}
                <div className="flex gap-2 mt-2">
                  {[10, 25, 50, 100].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQuantity(n)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: quantity === n ? "#e6fffa" : "#f8fafc",
                        color: quantity === n ? "#0f766e" : "#94a3b8",
                        border:
                          quantity === n
                            ? "1.5px solid #14b8a6"
                            : "1.5px solid #e2e8f0",
                      }}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview (existing medicine only) */}
              {!isNew && medicine && currentQty !== null && (
                <div
                  className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
                >
                  <span className="text-xs text-slate-600">
                    {medicine}: <b>{currentQty}</b> →{" "}
                    <b className="text-green-600">{currentQty + quantity}</b>{" "}
                    units
                  </span>
                  <span className="text-xs text-green-600 font-medium">
                    +{quantity}
                  </span>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div
                  className="rounded-xl p-3 flex items-center gap-2 text-xs font-medium"
                  style={{
                    background: feedback.ok ? "#f0fdf4" : "#fef2f2",
                    color: feedback.ok ? "#16a34a" : "#dc2626",
                  }}
                >
                  {feedback.ok ? <FaCheckCircle /> : <FaExclamationTriangle />}
                  {feedback.text}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: "#f1f5f9", color: "#64748b" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestock}
                  disabled={submitting || !medicine}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #0d3d3d, #14b8a6)",
                  }}
                >
                  {submitting ? (
                    <span className="animate-pulse">Processing…</span>
                  ) : isNew ? (
                    <>
                      <FaPlus size={12} /> Add Medicine
                    </>
                  ) : (
                    <>
                      <FaSync size={12} /> Confirm Restock
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
