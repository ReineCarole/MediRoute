"use client";

import { useState } from "react";
import {
  FaMapMarkedAlt,
  FaTachometerAlt,
  FaBoxes,
  FaClipboardList,
  FaCog,
  FaSignOutAlt,
  FaAmbulance,
  FaBars,
  FaTimes,
} from "react-icons/fa";

import DashboardTab from "./tabs/DashboardTab";
import MapTab from "./tabs/MapTab";
import InventoryTab from "./tabs/InventoryTab";
import OrdersTab from "./tabs/OrdersTab";
import SettingsTab from "./tabs/SettingsTab";

type Tab = "dashboard" | "map" | "inventory" | "orders" | "settings";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: FaTachometerAlt },
  { id: "map", label: "Live Map", icon: FaMapMarkedAlt },
  { id: "inventory", label: "Inventory", icon: FaBoxes },
  { id: "orders", label: "Orders", icon: FaClipboardList },
  { id: "settings", label: "Settings", icon: FaCog },
] as const;

export interface DispatchEntry {
  status: string;
  request?: string;
  message?: string;
  reason?: string;
  remaining_stock?: number;
  route?: { path: string[]; coords: number[][] };
  time: string;
}

export default function AppShell() {
  const [active, setActive] = useState<Tab>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [history, setHistory] = useState<DispatchEntry[]>([]);
  const [pendingRoute, setPendingRoute] = useState<number[][] | null>(null);

  function addHistory(entry: DispatchEntry) {
    setHistory((h) => [entry, ...h.slice(0, 49)]);
  }

  function handleDispatchRoute(coords: number[][], entry: DispatchEntry) {
    addHistory(entry);
    setPendingRoute(coords);
    setActive("map");
  }

  // Tab visibility helper — uses absolute positioning so ALL tabs are
  // always rendered and have real dimensions (fixes Leaflet grey map bug)
  function tabStyle(id: Tab): React.CSSProperties {
    return {
      position: "absolute",
      inset: 0,
      visibility: active === id ? "visible" : "hidden",
      pointerEvents: active === id ? "auto" : "none",
      zIndex: active === id ? 1 : 0,
      overflow: "hidden",
    };
  }

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif", background: "#f0f4f8" }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col h-full transition-all duration-300 flex-shrink-0"
        style={{
          width: collapsed ? 64 : 220,
          background:
            "linear-gradient(180deg, #0d3d3d 0%, #0a2e2e 60%, #071f1f 100%)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.25)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #2dd4bf, #14b8a6)" }}
          >
            <FaAmbulance className="text-white text-sm" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-white font-bold text-sm leading-none">
                MediRoute
              </p>
              <p className="text-teal-400 text-xs mt-0.5">
                Douala Supply Chain
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => setActive(id as Tab)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: isActive
                    ? "rgba(45,212,191,0.15)"
                    : "transparent",
                  borderLeft: isActive
                    ? "3px solid #2dd4bf"
                    : "3px solid transparent",
                }}
              >
                <Icon
                  className="flex-shrink-0"
                  style={{
                    color: isActive ? "#2dd4bf" : "#94a3b8",
                    fontSize: 15,
                  }}
                />
                {!collapsed && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: isActive ? "#e2fbf8" : "#94a3b8" }}
                  >
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse + Logout */}
        <div className="px-2 pb-4 space-y-1 border-t border-white/10 pt-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            {collapsed ? (
              <FaBars style={{ color: "#94a3b8", fontSize: 15 }} />
            ) : (
              <FaTimes style={{ color: "#94a3b8", fontSize: 15 }} />
            )}
            {!collapsed && (
              <span className="text-xs text-slate-400">Collapse</span>
            )}
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
            <FaSignOutAlt style={{ color: "#94a3b8", fontSize: 15 }} />
            {!collapsed && (
              <span className="text-xs text-slate-400">Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{
            background: "white",
            borderBottom: "1px solid #e2e8f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div>
            <h1 className="font-bold text-slate-800 text-base">
              {NAV.find((n) => n.id === active)?.label}
            </h1>
            <p className="text-xs text-slate-400">
              Douala Medical Supply System
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-slate-500">Backend connected</span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, #0d3d3d, #14b8a6)",
              }}
            >
              A
            </div>
          </div>
        </header>

        {/* 
          Tab container — position:relative so absolute children fill it.
          All tabs are always in the DOM (visibility:hidden when inactive)
          so Leaflet's container always has real pixel dimensions.
        */}
        <div className="flex-1 relative overflow-hidden">
          <div style={tabStyle("dashboard")}>
            <DashboardTab />
          </div>
          <div style={tabStyle("map")}>
            <MapTab
              isActive={active === "map"}
              pendingRoute={pendingRoute}
              onRouteConsumed={() => setPendingRoute(null)}
            />
          </div>
          <div style={tabStyle("inventory")}>
            <InventoryTab />
          </div>
          <div style={tabStyle("orders")}>
            <OrdersTab
              history={history}
              onQueue={addHistory}
              onDispatch={handleDispatchRoute}
            />
          </div>
          <div style={tabStyle("settings")}>
            <SettingsTab />
          </div>
        </div>
      </main>
    </div>
  );
}
