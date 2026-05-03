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
  FaUsers,
  FaDatabase,
} from "react-icons/fa";
import { useAuth } from "./auth/Authcontext";

import DashboardTab from "./tabs/DashboardTab";
import MapTab from "./tabs/MapTab";
import InventoryTab from "./tabs/InventoryTab";
import OrdersTab from "./tabs/OrdersTab";
import SettingsTab from "./tabs/SettingsTab";
import UsersTab from "./tabs/Userstab";
import DataStructuresTab from "./tabs/DataStructuresTab";

type Tab =
  | "dashboard"
  | "map"
  | "inventory"
  | "orders"
  | "settings"
  | "users"
  | "ds";

const NAV = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: FaTachometerAlt,
    permission: "read",
  },
  { id: "map", label: "Live Map", icon: FaMapMarkedAlt, permission: "read" },
  { id: "inventory", label: "Inventory", icon: FaBoxes, permission: "read" },
  {
    id: "orders",
    label: "Orders",
    icon: FaClipboardList,
    permission: "dispatch",
  },
  { id: "settings", label: "Settings", icon: FaCog, permission: "block_roads" },
  { id: "users", label: "Users", icon: FaUsers, permission: "manage_users" },
  { id: "ds", label: "Data Structures", icon: FaDatabase, permission: "read" },
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

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  superadmin: { bg: "#fef3c7", color: "#d97706" },
  admin: { bg: "#ede9fe", color: "#7c3aed" },
  dispatcher: { bg: "#e0f2fe", color: "#0369a1" },
  viewer: { bg: "#f0fdf4", color: "#16a34a" },
};

export default function AppShell() {
  const { user, logout, hasPermission } = useAuth();

  const [active, setActive] = useState<Tab>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [history, setHistory] = useState<DispatchEntry[]>([]);
  const [pendingRoute, setPendingRoute] = useState<number[][] | null>(null);

  // Filter nav items by role
  const visibleNav = NAV.filter((item) => hasPermission(item.permission));

  function addHistory(entry: DispatchEntry) {
    setHistory((h) => [entry, ...h.slice(0, 49)]);
  }

  function handleDispatchRoute(coords: number[][], entry: DispatchEntry) {
    addHistory(entry);
    setPendingRoute(coords);
    setActive("map");
  }

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

  const roleStyle = ROLE_COLORS[user?.role ?? "viewer"];

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

        {/* User card */}
        {!collapsed && user && (
          <div
            className="mx-3 mt-3 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <p className="text-white text-xs font-semibold truncate">
              {user.name}
            </p>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block"
              style={{ background: roleStyle.bg, color: roleStyle.color }}
            >
              {user.role}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {visibleNav.map(({ id, label, icon: Icon }) => {
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
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-900/20 transition-colors group"
          >
            <FaSignOutAlt
              style={{ color: "#94a3b8", fontSize: 15 }}
              className="group-hover:text-red-400"
            />
            {!collapsed && (
              <span className="text-xs text-slate-400 group-hover:text-red-400">
                Logout
              </span>
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
            {user && (
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium hidden sm:block"
                  style={{ background: roleStyle.bg, color: roleStyle.color }}
                >
                  {user.role}
                </span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{
                    background: "linear-gradient(135deg, #0d3d3d, #14b8a6)",
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Tabs */}
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
            {hasPermission("dispatch") ? (
              <OrdersTab
                history={history}
                onQueue={addHistory}
                onDispatch={handleDispatchRoute}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-slate-500 font-medium">
                    Access restricted
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    Your role does not have dispatch permission
                  </p>
                </div>
              </div>
            )}
          </div>
          <div style={tabStyle("settings")}>
            {hasPermission("block_roads") ? (
              <SettingsTab />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-slate-500 font-medium">
                    Access restricted
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    Your role does not have settings permission
                  </p>
                </div>
              </div>
            )}
          </div>
          <div style={tabStyle("users")}>
            {hasPermission("manage_users") ? (
              <UsersTab />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-400 text-sm">Superadmin access only</p>
              </div>
            )}
          </div>
          <div style={tabStyle("ds")}>
            <DataStructuresTab />
          </div>
        </div>
      </main>
    </div>
  );
}
