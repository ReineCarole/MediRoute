"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FaProjectDiagram,
  FaSortAmountDown,
  FaLayerGroup,
  FaTree,
  FaHashtag,
  FaStream,
  FaSync,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { apiFetch } from "../auth/Api";
import { useAuth } from "../auth/Authcontext";

type DSKey =
  | "graph"
  | "priority_queue"
  | "stack"
  | "bst"
  | "hash_table"
  | "fifo_queue";

const DS_META: Record<
  DSKey,
  {
    label: string;
    icon: any;
    color: string;
    bg: string;
    description: string;
    complexity: string;
  }
> = {
  graph: {
    label: "Graph",
    icon: FaProjectDiagram,
    color: "#0369a1",
    bg: "#e0f2fe",
    description: "Douala road network — Dijkstra shortest path",
    complexity: "Dijkstra: O((V+E) log V)",
  },
  priority_queue: {
    label: "Priority Queue",
    icon: FaSortAmountDown,
    color: "#7c3aed",
    bg: "#ede9fe",
    description: "Min-heap for supply requests by urgency",
    complexity: "Insert/Extract: O(log n)",
  },
  stack: {
    label: "Stack (LIFO)",
    icon: FaLayerGroup,
    color: "#b45309",
    bg: "#fef3c7",
    description: "Last-In-First-Out delivery history",
    complexity: "Push/Pop: O(1)",
  },
  bst: {
    label: "BST",
    icon: FaTree,
    color: "#16a34a",
    bg: "#f0fdf4",
    description: "Binary Search Tree of facilities by name",
    complexity: "Search: O(log n) avg",
  },
  hash_table: {
    label: "Hash Table",
    icon: FaHashtag,
    color: "#dc2626",
    bg: "#fef2f2",
    description: "O(1) inventory lookup by medicine name",
    complexity: "Lookup: O(1) avg",
  },
  fifo_queue: {
    label: "Queue (FIFO)",
    icon: FaStream,
    color: "#0f766e",
    bg: "#e6fffa",
    description: "First-In-First-Out request processing order",
    complexity: "Enqueue/Dequeue: O(1)",
  },
};

export default function DataStructuresTab() {
  const { user } = useAuth();
  const token = user?.token;

  const [active, setActive] = useState<DSKey>("graph");
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Graph panel
  const [dijkSrc, setDijkSrc] = useState("");
  const [dijkDst, setDijkDst] = useState("");
  const [dijkResult, setDijkResult] = useState<any>(null);
  const [dijkLoading, setDijkLoading] = useState(false);

  // BST panel
  const [bstQuery, setBstQuery] = useState("");
  const [bstResult, setBstResult] = useState<any>(null);
  const [bstLoading, setBstLoading] = useState(false);

  // Hash table panel
  const [htQuery, setHtQuery] = useState("");
  const [htResult, setHtResult] = useState<any>(null);

  const fetchSnapshot = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch("/ds/snapshot");
      const data = await res.json();
      setSnapshot(data);
      // Set defaults for selectors
      if (data?.graph?.nodes?.length > 0 && !dijkSrc) {
        setDijkSrc(data.graph.nodes[0].name);
        setDijkDst(data.graph.nodes[1]?.name ?? data.graph.nodes[0].name);
      }
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchSnapshot();
    const id = setInterval(fetchSnapshot, 5000);
    return () => clearInterval(id);
  }, [fetchSnapshot, token]);

  async function runDijkstra() {
    setDijkLoading(true);
    try {
      const res = await apiFetch(
        `/ds/dijkstra?source=${encodeURIComponent(dijkSrc)}&destination=${encodeURIComponent(dijkDst)}`,
      );
      const data = await res.json();
      setDijkResult(data);
    } catch {}
    setDijkLoading(false);
  }

  async function runBstSearch() {
    if (!bstQuery.trim()) return;
    setBstLoading(true);
    try {
      const res = await apiFetch(
        `/ds/bst/search?query=${encodeURIComponent(bstQuery)}`,
      );
      const data = await res.json();
      setBstResult(data);
    } catch {}
    setBstLoading(false);
  }

  function lookupHash() {
    if (!snapshot?.hash_table?.buckets || !htQuery) {
      setHtResult(null);
      return;
    }
    const all: any[] = snapshot.hash_table.buckets.flatMap(
      (b: any) => b.entries,
    );
    const found = all.find(
      (e: any) => e.key.toLowerCase() === htQuery.toLowerCase(),
    );
    setHtResult(found ?? null);
  }

  const meta = DS_META[active];

  if (loading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ background: "#f0f4f8" }}
      >
        <div className="text-center">
          <FaSync className="animate-spin text-teal-500 text-2xl mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading data structures…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex overflow-hidden"
      style={{ background: "#f0f4f8" }}
    >
      {/* ── Left sidebar: DS selector ──────────────────────────────────── */}
      <div
        className="w-56 flex-shrink-0 p-4 flex flex-col gap-2 overflow-y-auto"
        style={{ background: "white", borderRight: "1px solid #e2e8f0" }}
      >
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
          Data Structures
        </p>
        {(Object.keys(DS_META) as DSKey[]).map((key) => {
          const m = DS_META[key];
          const Icon = m.icon;
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
              style={{
                background: isActive ? m.bg : "transparent",
                border: isActive
                  ? `1.5px solid ${m.color}20`
                  : "1.5px solid transparent",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: isActive ? m.color : "#f1f5f9" }}
              >
                <Icon
                  style={{
                    color: isActive ? "white" : "#94a3b8",
                    fontSize: 12,
                  }}
                />
              </div>
              <div>
                <p
                  className="text-xs font-semibold"
                  style={{ color: isActive ? m.color : "#64748b" }}
                >
                  {m.label}
                </p>
              </div>
            </button>
          );
        })}

        <button
          onClick={fetchSnapshot}
          className="mt-auto flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: "#e6fffa", color: "#0f766e" }}
        >
          <FaSync size={9} /> Refresh
        </button>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div
          className="rounded-2xl p-5 mb-5 flex items-start justify-between"
          style={{ background: "linear-gradient(135deg, #0d3d3d, #0f766e)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <meta.icon className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{meta.label}</h2>
              <p className="text-teal-200 text-xs mt-0.5">{meta.description}</p>
            </div>
          </div>
          <span
            className="px-3 py-1.5 rounded-full text-xs font-mono font-semibold"
            style={{ background: "rgba(255,255,255,0.15)", color: "#99f6e4" }}
          >
            {meta.complexity}
          </span>
        </div>

        {/* ── GRAPH ──────────────────────────────────────────────────── */}
        {active === "graph" && snapshot?.graph && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Nodes", value: snapshot.graph.node_count },
                { label: "Edges", value: snapshot.graph.edge_count },
                {
                  label: "Blocked Roads",
                  value: snapshot.graph.edges.filter((e: any) => e.blocked)
                    .length,
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4 text-center"
                  style={{
                    background: "white",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <p className="text-2xl font-bold text-slate-800">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Dijkstra runner */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <FaProjectDiagram className="text-blue-500" /> Run Dijkstra
              </h3>
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">
                    Source
                  </label>
                  <select
                    value={dijkSrc}
                    onChange={(e) => setDijkSrc(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none"
                    style={{ color: "#1e293b", background: "#f8fafc" }}
                  >
                    {snapshot.graph.nodes.map((n: any) => (
                      <option key={n.name} value={n.name}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">
                    Destination
                  </label>
                  <select
                    value={dijkDst}
                    onChange={(e) => setDijkDst(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none"
                    style={{ color: "#1e293b", background: "#f8fafc" }}
                  >
                    {snapshot.graph.nodes.map((n: any) => (
                      <option key={n.name} value={n.name}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={runDijkstra}
                    disabled={dijkLoading || dijkSrc === dijkDst}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                    style={{ background: "#0369a1" }}
                  >
                    {dijkLoading ? (
                      <FaSync className="animate-spin" size={12} />
                    ) : (
                      "Find Path"
                    )}
                  </button>
                </div>
              </div>
              {dijkResult && !dijkResult.error && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: "#e0f2fe" }}
                >
                  <p className="text-xs font-semibold text-blue-700 mb-2">
                    Shortest path — cost: <b>{dijkResult.cost} min</b>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {dijkResult.path.map((node: string, i: number) => (
                      <span key={i} className="flex items-center gap-1">
                        <span
                          className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={{
                            background: "white",
                            color: "#0369a1",
                            border: "1px solid #bae6fd",
                          }}
                        >
                          {node}
                        </span>
                        {i < dijkResult.path.length - 1 && (
                          <span className="text-blue-400 text-xs">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dijkResult?.error && (
                <p className="text-xs text-red-500 mt-2">
                  ⚠ {dijkResult.error}
                </p>
              )}
            </div>

            {/* Node list */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700 text-sm">
                  Adjacency List (first 10 nodes)
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {snapshot.graph.nodes.slice(0, 10).map((node: any) => (
                  <div
                    key={node.name}
                    className="px-5 py-2.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: "#0369a1" }}
                      />
                      <span className="text-xs font-medium text-slate-700">
                        {node.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {node.type}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "#e0f2fe", color: "#0369a1" }}
                      >
                        {node.neighbors} edge{node.neighbors !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PRIORITY QUEUE ─────────────────────────────────────────── */}
        {active === "priority_queue" && snapshot?.priority_queue && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div
                className="rounded-2xl p-4 text-center"
                style={{
                  background: "white",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <p className="text-2xl font-bold text-slate-800">
                  {snapshot.priority_queue.size}
                </p>
                <p className="text-xs text-slate-500 mt-1">Orders in queue</p>
              </div>
              <div
                className="rounded-2xl p-4 text-center"
                style={{
                  background: "white",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <p className="text-2xl font-bold text-slate-800">
                  {snapshot.priority_queue.items[0]?.priority ?? "—"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Next priority (lowest = highest)
                </p>
              </div>
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700 text-sm">
                  Heap Contents (priority order)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Implemented as a min-heap with negated priorities
                </p>
              </div>
              {snapshot.priority_queue.items.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  Queue is empty
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {snapshot.priority_queue.items.map((item: any, i: number) => {
                    const pColor =
                      item.priority <= 2
                        ? "#ef4444"
                        : item.priority === 3
                          ? "#f59e0b"
                          : "#10b981";
                    return (
                      <div
                        key={i}
                        className="px-5 py-3 flex items-center gap-3"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: pColor }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-700">
                            {item.facility}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.quantity}× {item.medicine}
                          </p>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: `${pColor}20`, color: pColor }}
                        >
                          P{item.priority}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STACK ──────────────────────────────────────────────────── */}
        {active === "stack" && snapshot?.stack && (
          <div className="space-y-4">
            <div
              className="rounded-2xl p-4 text-center"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <p className="text-2xl font-bold text-slate-800">
                {snapshot.stack.size}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Total deliveries dispatched
              </p>
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700 text-sm">
                  Stack — Top 10 (LIFO order)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Most recent dispatch is at the top
                </p>
              </div>
              {snapshot.stack.items.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  No dispatches yet — dispatch an order to push to the stack
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {snapshot.stack.items.map((item: any, i: number) => (
                    <div key={i} className="px-5 py-3 flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{
                          background: i === 0 ? "#fef3c7" : "#f8fafc",
                          color: i === 0 ? "#b45309" : "#94a3b8",
                        }}
                      >
                        {i === 0 ? "TOP" : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700">
                          {item.facility}
                        </p>
                        <p className="text-xs text-slate-400">
                          {item.quantity}× {item.medicine} · {item.cost} min
                        </p>
                        <p className="text-xs text-teal-600 truncate mt-0.5">
                          {item.path?.join(" → ")}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">
                        by {item.by}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BST ────────────────────────────────────────────────────── */}
        {active === "bst" && snapshot?.bst && (
          <div className="space-y-4">
            <div
              className="rounded-2xl p-4 text-center"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <p className="text-2xl font-bold text-slate-800">
                {snapshot.bst.size}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Facilities indexed in BST
              </p>
            </div>

            {/* Search */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <FaSearch className="text-green-500" /> Search BST
              </h3>
              <div className="flex gap-2">
                <input
                  value={bstQuery}
                  onChange={(e) => setBstQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runBstSearch()}
                  placeholder="Facility name e.g. Hôpital Laquintinie"
                  className="flex-1 border border-slate-200 rounded-lg p-2.5 text-xs outline-none"
                  style={{ color: "#1e293b", background: "#f8fafc" }}
                />
                <button
                  onClick={runBstSearch}
                  disabled={bstLoading || !bstQuery.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                  style={{ background: "#16a34a" }}
                >
                  {bstLoading ? (
                    <FaSync className="animate-spin" size={12} />
                  ) : (
                    "Search"
                  )}
                </button>
              </div>

              {bstResult && (
                <div
                  className="mt-3 rounded-xl p-4"
                  style={{
                    background: bstResult.found ? "#f0fdf4" : "#fef2f2",
                  }}
                >
                  <p
                    className="text-xs font-semibold mb-2"
                    style={{ color: bstResult.found ? "#16a34a" : "#dc2626" }}
                  >
                    {bstResult.found ? (
                      <>
                        <FaCheckCircle className="inline mr-1" />
                        Found
                      </>
                    ) : (
                      <>
                        <FaTimesCircle className="inline mr-1" />
                        Not found
                      </>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mb-2">
                    Traversal path ({bstResult.path?.length} comparisons):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {bstResult.path?.map((node: string, i: number) => (
                      <span key={i} className="flex items-center gap-1">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            background: node === bstQuery ? "#16a34a" : "white",
                            color: node === bstQuery ? "white" : "#64748b",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          {node}
                        </span>
                        {i < bstResult.path.length - 1 && (
                          <span className="text-slate-300 text-xs">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                  {bstResult.node && (
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-xs text-green-700">
                        Type: <b>{bstResult.node.type}</b> ·{" "}
                        {bstResult.node.arrondissement}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* In-order list */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700 text-sm">
                  In-order Traversal (alphabetical)
                </h3>
              </div>
              <div
                className="divide-y divide-slate-50 overflow-y-auto"
                style={{ maxHeight: 300 }}
              >
                {snapshot.bst.items.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="px-5 py-2 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-6">
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-700">
                        {item.key}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {item.value?.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── HASH TABLE ─────────────────────────────────────────────── */}
        {active === "hash_table" && snapshot?.hash_table && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div
                className="rounded-2xl p-4 text-center"
                style={{
                  background: "white",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <p className="text-2xl font-bold text-slate-800">
                  {snapshot.hash_table.size}
                </p>
                <p className="text-xs text-slate-500 mt-1">Medicines stored</p>
              </div>
              <div
                className="rounded-2xl p-4 text-center"
                style={{
                  background: "white",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <p className="text-2xl font-bold text-slate-800">
                  {snapshot.hash_table.capacity}
                </p>
                <p className="text-xs text-slate-500 mt-1">Bucket capacity</p>
              </div>
            </div>

            {/* Lookup */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <FaHashtag className="text-red-500" /> O(1) Lookup
              </h3>
              <div className="flex gap-2">
                <input
                  value={htQuery}
                  onChange={(e) => setHtQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") lookupHash();
                  }}
                  placeholder="Medicine name e.g. Oxygen"
                  className="flex-1 border border-slate-200 rounded-lg p-2.5 text-xs outline-none"
                  style={{ color: "#1e293b", background: "#f8fafc" }}
                />
                <button
                  onClick={lookupHash}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "#dc2626" }}
                >
                  Lookup
                </button>
              </div>
              {htQuery && (
                <div
                  className="mt-3 rounded-xl p-3"
                  style={{ background: htResult ? "#f0fdf4" : "#fef2f2" }}
                >
                  {htResult ? (
                    <p className="text-xs font-medium text-green-700">
                      <FaCheckCircle className="inline mr-1" />
                      <b>{htResult.key}</b>: {htResult.value} units in stock
                      <span className="ml-2 text-green-500">
                        (hash ={" "}
                        {htResult.key
                          .split("")
                          .reduce(
                            (a: number, c: string) => a + c.charCodeAt(0),
                            0,
                          ) % 16}
                        )
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-red-600">
                      <FaTimesCircle className="inline mr-1" /> "{htQuery}" not
                      found in inventory
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Buckets */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700 text-sm">
                  Hash Buckets (non-empty)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  hash(key) = sum of ASCII values % 16
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {snapshot.hash_table.buckets.map((bucket: any) => (
                  <div
                    key={bucket.bucket}
                    className="px-5 py-2.5 flex items-center gap-3"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: "#fef2f2", color: "#dc2626" }}
                    >
                      {bucket.bucket}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {bucket.entries.map((e: any) => (
                        <span
                          key={e.key}
                          className="px-2 py-1 rounded-lg text-xs"
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            color: "#1e293b",
                          }}
                        >
                          {e.key}: <b>{e.value}</b>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FIFO QUEUE ─────────────────────────────────────────────── */}
        {active === "fifo_queue" && snapshot?.fifo_queue && (
          <div className="space-y-4">
            <div
              className="rounded-2xl p-4 text-center"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <p className="text-2xl font-bold text-slate-800">
                {snapshot.fifo_queue.size}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Total requests enqueued this session
              </p>
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700 text-sm">
                  FIFO Queue — Arrival Order
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  First request added is first to be shown here
                </p>
              </div>
              {snapshot.fifo_queue.items.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  No requests yet — add a request in the Orders tab
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {snapshot.fifo_queue.items.map((item: any, i: number) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{
                          background: i === 0 ? "#e6fffa" : "#f8fafc",
                          color: i === 0 ? "#0f766e" : "#94a3b8",
                        }}
                      >
                        {i === 0 ? "←" : i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-700">
                          {item.facility}
                        </p>
                        <p className="text-xs text-slate-400">
                          {item.quantity}× {item.medicine}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "#eff6ff", color: "#2563eb" }}
                      >
                        P{item.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
