"use client";

import { useEffect, useState } from "react";
import {
  FaUsers,
  FaSync,
  FaUserShield,
  FaUserCog,
  FaUserTie,
  FaEye,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { apiFetch, apiPost } from "../auth/Api";
import { useAuth } from "../auth/Authcontext";

interface User {
  username: string;
  name: string;
  role: string;
  phone: string;
  profession: string;
}

const ROLES = ["viewer", "dispatcher", "admin", "superadmin"] as const;

const ROLE_META: Record<
  string,
  { color: string; bg: string; icon: any; label: string }
> = {
  superadmin: {
    color: "#d97706",
    bg: "#fef3c7",
    icon: FaUserShield,
    label: "Superadmin",
  },
  admin: { color: "#7c3aed", bg: "#ede9fe", icon: FaUserCog, label: "Admin" },
  dispatcher: {
    color: "#0369a1",
    bg: "#e0f2fe",
    icon: FaUserTie,
    label: "Dispatcher",
  },
  viewer: { color: "#16a34a", bg: "#f0fdf4", icon: FaEye, label: "Viewer" },
};

export default function UsersTab() {
  const { user: currentUser } = useAuth();
  const token = currentUser?.token;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null); // username being updated
  const [feedback, setFeedback] = useState<{
    username: string;
    text: string;
    ok: boolean;
  } | null>(null);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await apiFetch("/users");
      const data = await res.json();
      setUsers(data?.users ?? []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (!token) return;
    fetchUsers();
  }, [token]);

  async function changeRole(username: string, newRole: string) {
    setUpdating(username);
    setFeedback(null);
    try {
      const res = await apiFetch(
        `/users/${encodeURIComponent(username)}/role?role=${encodeURIComponent(newRole)}`,
        { method: "PATCH" },
      );
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ username, text: data.detail ?? "Failed", ok: false });
      } else {
        setFeedback({ username, text: data.message, ok: true });
        // Update locally without re-fetching
        setUsers((prev) =>
          prev.map((u) =>
            u.username === username ? { ...u, role: newRole } : u,
          ),
        );
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      setFeedback({
        username,
        text: "Could not connect to backend",
        ok: false,
      });
    } finally {
      setUpdating(null);
    }
  }

  const totalByRole = ROLES.reduce(
    (acc, role) => {
      acc[role] = users.filter((u) => u.role === role).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div
      className="h-full overflow-y-auto p-6"
      style={{ background: "#f0f4f8" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-slate-800 text-base">
            User Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage roles for all registered users
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: "#e6fffa", color: "#0f766e" }}
        >
          <FaSync size={10} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {ROLES.map((role) => {
          const meta = ROLE_META[role];
          const Icon = meta.icon;
          return (
            <div
              key={role}
              className="rounded-2xl p-4"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: meta.bg }}
              >
                <Icon style={{ color: meta.color, fontSize: 18 }} />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {totalByRole[role] ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{meta.label}</p>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "white",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <FaUsers className="text-teal-500" />
          <h3 className="font-semibold text-slate-700 text-sm">
            All Users
            <span
              className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: "#e6fffa", color: "#0f766e" }}
            >
              {users.length}
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Loading users…
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">
                  User
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">
                  Profession
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">
                  Current Role
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">
                  Change Role
                </th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const meta = ROLE_META[u.role] ?? ROLE_META["viewer"];
                const Icon = meta.icon;
                const isSelf = u.username === currentUser?.username;
                const isUpdating = updating === u.username;

                return (
                  <tr
                    key={u.username}
                    className="border-t border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    {/* User info */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{
                            background:
                              "linear-gradient(135deg, #0d3d3d, #14b8a6)",
                          }}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            {u.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            @{u.username}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Profession */}
                    <td className="px-5 py-3">
                      <span className="text-xs text-slate-500">
                        {u.profession || (
                          <span className="italic text-slate-300">—</span>
                        )}
                      </span>
                    </td>

                    {/* Current role badge */}
                    <td className="px-5 py-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        <Icon size={10} />
                        {meta.label}
                      </span>
                    </td>

                    {/* Role selector */}
                    <td className="px-5 py-3">
                      {isSelf ? (
                        <span className="text-xs text-slate-400 italic">
                          Your account
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) =>
                            changeRole(u.username, e.target.value)
                          }
                          disabled={isUpdating}
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none disabled:opacity-50"
                          style={{
                            color: "#1e293b",
                            background: "#f8fafc",
                            minWidth: 130,
                          }}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_META[r].label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* Feedback */}
                    <td className="px-5 py-3 w-48">
                      {isUpdating && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <FaSync size={9} className="animate-spin" /> Updating…
                        </span>
                      )}
                      {feedback?.username === u.username && !isUpdating && (
                        <span
                          className="text-xs flex items-center gap-1 font-medium"
                          style={{ color: feedback.ok ? "#16a34a" : "#dc2626" }}
                        >
                          {feedback.ok ? (
                            <FaCheckCircle size={10} />
                          ) : (
                            <FaExclamationTriangle size={10} />
                          )}
                          {feedback.text}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Info note */}
      <p className="text-xs text-slate-400 text-center mt-4">
        Role changes take effect on the user's next login session. You cannot
        change your own role.
      </p>
    </div>
  );
}
