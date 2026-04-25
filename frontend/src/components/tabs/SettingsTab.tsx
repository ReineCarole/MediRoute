"use client";

import { useEffect, useState } from "react";
import {
  FaBan,
  FaUnlock,
  FaClock,
  FaSync,
  FaExclamationTriangle,
} from "react-icons/fa";

const API = "http://localhost:8000";

export default function SettingsTab() {
  const [nodes, setNodes] = useState<string[]>([]);
  const [fromNode, setFromNode] = useState("");
  const [toNode, setToNode] = useState("");
  const [delayTime, setDelayTime] = useState(5);
  const [blocked, setBlocked] = useState<string[][]>([]);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/nodes`)
      .then((r) => r.json())
      .then((data) => {
        const names = data.nodes.map((n: any) => n.name);
        setNodes(names);
        if (names.length >= 2) {
          setFromNode(names[0]);
          setToNode(names[1]);
        }
      });
    fetchBlocked();
  }, []);

  async function fetchBlocked() {
    const res = await fetch(`${API}/roads/blocked`);
    const data = await res.json();
    setBlocked(data.blocked);
  }

  async function action(endpoint: string, body: Record<string, any>) {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams(body);
      const res = await fetch(`${API}${endpoint}?${params}`, {
        method: "POST",
      });
      const data = await res.json();
      setMessage({ text: data.message ?? "Done", ok: res.ok });
      fetchBlocked();
    } catch {
      setMessage({ text: "Failed to connect to backend", ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="h-full overflow-y-auto p-6"
      style={{ background: "#f0f4f8" }}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Road controls */}
        <div
          className="rounded-2xl overflow-hidden"
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
              <FaBan /> Road Controls
            </h3>
            <p className="text-teal-200 text-xs mt-0.5">
              Block, unblock or delay roads in the network
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Node selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  From
                </label>
                <select
                  value={fromNode}
                  onChange={(e) => setFromNode(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 outline-none"
                >
                  {nodes.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  To
                </label>
                <select
                  value={toNode}
                  onChange={(e) => setToNode(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 outline-none"
                >
                  {nodes.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Delay input */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Delay (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={delayTime}
                onChange={(e) => setDelayTime(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-slate-50 outline-none focus:border-teal-400"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() =>
                  action("/road/block", {
                    from_node: fromNode,
                    to_node: toNode,
                  })
                }
                disabled={loading || fromNode === toNode}
                className="py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all"
                style={{ background: "#ef4444" }}
              >
                <FaBan size={11} /> Block
              </button>
              <button
                onClick={() =>
                  action("/road/unblock", {
                    from_node: fromNode,
                    to_node: toNode,
                  })
                }
                disabled={loading}
                className="py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all"
                style={{ background: "#10b981" }}
              >
                <FaUnlock size={11} /> Unblock
              </button>
              <button
                onClick={() =>
                  action("/road/delay", {
                    from_node: fromNode,
                    to_node: toNode,
                    extra_time: delayTime,
                  })
                }
                disabled={loading || fromNode === toNode}
                className="py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all"
                style={{ background: "#f59e0b" }}
              >
                <FaClock size={11} /> Delay
              </button>
            </div>

            {/* Feedback */}
            {message && (
              <div
                className="rounded-xl p-3 text-xs font-medium flex items-center gap-2"
                style={{
                  background: message.ok ? "#f0fdf4" : "#fef2f2",
                  color: message.ok ? "#16a34a" : "#dc2626",
                }}
              >
                {message.ok ? (
                  <FaUnlock size={11} />
                ) : (
                  <FaExclamationTriangle size={11} />
                )}
                {message.text}
              </div>
            )}
          </div>
        </div>

        {/* Currently blocked roads */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "white",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <FaBan className="text-red-400" />
              Currently Blocked Roads
            </h3>
            <button
              onClick={fetchBlocked}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{ background: "#f0fdf4", color: "#16a34a" }}
            >
              <FaSync size={9} /> Refresh
            </button>
          </div>

          <div className="divide-y divide-slate-50">
            {blocked.length === 0 && (
              <div className="p-8 text-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
                  style={{ background: "#f0fdf4" }}
                >
                  <FaUnlock className="text-green-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">
                  All roads are clear
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  No blocked roads in the network
                </p>
              </div>
            )}
            {blocked.map(([from, to], i) => (
              <div
                key={i}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs text-slate-700 font-medium">
                    {from}
                  </span>
                  <span className="text-xs text-slate-400">→</span>
                  <span className="text-xs text-slate-700 font-medium">
                    {to}
                  </span>
                </div>
                <button
                  onClick={() =>
                    action("/road/unblock", { from_node: from, to_node: to })
                  }
                  className="text-xs px-2 py-1 rounded-lg font-medium transition-colors"
                  style={{ background: "#f0fdf4", color: "#16a34a" }}
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
