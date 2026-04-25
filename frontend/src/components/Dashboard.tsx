"use client";

import { useEffect, useState } from "react";
import {
  FaAmbulance,
  FaBoxOpen,
  FaExclamationCircle,
  FaBolt,
  FaTimes,
  FaCheckCircle,
  FaTimesCircle,
  FaInbox,
  FaRoad,
} from "react-icons/fa";
import { MdLocalPharmacy } from "react-icons/md";

const API = "http://localhost:8000";

interface Props {
  onRoute: (coords: number[][]) => void;
  onClear: () => void;
  status: string;
  selectedFacility: string;
  onFacilityChange: (name: string) => void;
}

export default function Dashboard({
  onRoute,
  onClear,
  status,
  selectedFacility,
  onFacilityChange,
}: Props) {
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [facilities, setFacilities] = useState<any[]>([]);
  const [medicine, setMedicine] = useState("");
  const [priority, setPriority] = useState(1);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load inventory
  useEffect(() => {
    fetch(`${API}/inventory`)
      .then((r) => r.json())
      .then((data) => {
        const depot = data.inventory["Dépôt Central Akwa"] ?? {};
        setInventory(depot);
        const meds = Object.keys(depot);
        if (meds.length > 0) setMedicine(meds[0]);
      });
  }, [result]);

  // Load facilities
  useEffect(() => {
    fetch(`${API}/nodes`)
      .then((r) => r.json())
      .then((data) => {
        const filtered = data.nodes.filter((n: any) => n.type !== "depot");
        setFacilities(filtered);
        if (filtered.length > 0 && !selectedFacility) {
          onFacilityChange(filtered[0].name);
        }
      });
  }, []);

  async function createRequest() {
    if (!selectedFacility) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/request?facility=${encodeURIComponent(selectedFacility)}&medicine=${encodeURIComponent(medicine)}&priority=${priority}`,
        { method: "POST" },
      );
      const data = await res.json();
      setResult({ status: "QUEUED", request: data.data });
    } finally {
      setLoading(false);
    }
  }

  async function processRequest() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/process`);
      const data = await res.json();
      setResult(data);
      if (data.route?.coords) onRoute(data.route.coords);
    } finally {
      setLoading(false);
    }
  }

  const stockColor = (qty: number) =>
    qty <= 5
      ? "text-red-500"
      : qty <= 15
        ? "text-yellow-500"
        : "text-green-600";

  const statusIcon =
    status === "Delivered ✅" ? (
      <FaCheckCircle className="inline mr-1 text-green-300" />
    ) : status === "Delivering…" ? (
      <FaAmbulance className="inline mr-1 text-white animate-pulse" />
    ) : (
      <FaAmbulance className="inline mr-1 text-blue-200" />
    );

  return (
    <div className="m-4 bg-white rounded-2xl shadow-xl w-72 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 px-4 py-3">
        <h2 className="font-bold text-white text-sm flex items-center gap-2">
          <FaAmbulance className="text-white text-base" />
          MediRoute — Douala
        </h2>
        <p className="text-blue-100 text-xs mt-1 flex items-center">
          {statusIcon}
          {status}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Inventory */}
        <section>
          <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <FaBoxOpen className="text-orange-400" />
            Depot Stock
          </h3>
          <div className="space-y-1">
            {Object.entries(inventory).map(([med, qty]) => (
              <div
                key={med}
                className="flex justify-between items-center text-xs"
              >
                <span className="text-gray-700 flex items-center gap-1">
                  <MdLocalPharmacy className="text-blue-400" />
                  {med}
                </span>
                <span className={`font-semibold ${stockColor(qty)}`}>
                  {qty}
                </span>
              </div>
            ))}
            {Object.keys(inventory).length === 0 && (
              <p className="text-xs text-gray-400">Loading…</p>
            )}
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* Request form */}
        <section>
          <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <FaExclamationCircle className="text-red-400" />
            New Request
            {selectedFacility && (
              <span className="ml-1 font-normal text-blue-500 normal-case text-xs">
                (from map ✓)
              </span>
            )}
          </h3>

          <div className="space-y-2">
            <select
              className="w-full border border-gray-200 rounded-lg p-2 text-xs text-gray-400 bg-gray-50"
              value={selectedFacility}
              onChange={(e) => onFacilityChange(e.target.value)}
            >
              <option value="">Select facility…</option>
              {facilities.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.type})
                </option>
              ))}
            </select>

            <select
              className="w-full border border-gray-200 rounded-lg p-2 text-xs text-gray-400 bg-gray-50"
              value={medicine}
              onChange={(e) => setMedicine(e.target.value)}
            >
              {Object.keys(inventory).map((med) => (
                <option key={med} value={med}>
                  {med}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">
                Priority (1–10)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg p-2 text-xs text-gray-400 bg-gray-50"
              />
            </div>

            <button
              onClick={createRequest}
              disabled={loading || !selectedFacility}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FaInbox />
              {loading ? "Adding…" : "Add Request"}
            </button>
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* Dispatch + Clear */}
        <section className="flex gap-2">
          <button
            onClick={processRequest}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <FaBolt />
            Dispatch
          </button>
          <button
            onClick={onClear}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <FaTimes />
            Clear
          </button>
        </section>

        {/* Result */}
        {result && (
          <div
            className={`rounded-lg p-3 text-xs ${
              result.status === "APPROVED"
                ? "bg-green-50 text-green-800"
                : result.status === "FAILED"
                  ? "bg-red-50 text-red-800"
                  : result.status === "QUEUED"
                    ? "bg-blue-50 text-blue-800"
                    : "bg-gray-50 text-gray-700"
            }`}
          >
            <p className="font-semibold mb-1 flex items-center gap-1">
              {result.status === "APPROVED" && (
                <FaCheckCircle className="text-green-600" />
              )}
              {result.status === "FAILED" && (
                <FaTimesCircle className="text-red-500" />
              )}
              {result.status === "QUEUED" && (
                <FaInbox className="text-blue-500" />
              )}
              {result.status === "APPROVED"
                ? "Approved"
                : result.status === "FAILED"
                  ? "Failed"
                  : result.status === "QUEUED"
                    ? "Queued"
                    : (result.message ?? result.status)}
            </p>
            {result.request && <p className="opacity-80">{result.request}</p>}
            {result.reason && (
              <p className="opacity-80">Reason: {result.reason}</p>
            )}
            {result.route && (
              <p className="opacity-80 mt-1 flex items-start gap-1">
                <FaRoad className="mt-0.5 flex-shrink-0" />
                {result.route.path?.join(" → ")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
