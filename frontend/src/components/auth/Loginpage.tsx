"use client";

import { useState } from "react";
import { useAuth } from "./Authcontext";
import {
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaAmbulance,
  FaUserPlus,
  FaSignInAlt,
  FaHospital,
  FaFlask,
  FaPills,
  FaPhone,
  FaMapMarkerAlt,
  FaBriefcase,
  FaCheckCircle,
} from "react-icons/fa";

const ROLES = [
  { value: "viewer", label: "Viewer — Read only access" },
  { value: "dispatcher", label: "Dispatcher — Queue and dispatch orders" },
  { value: "admin", label: "Admin — Full access except user mgmt" },
];

export default function LoginPage() {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [success, setSuccess] = useState("");

  // Login fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regName, setRegName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regRole, setRegRole] = useState("viewer");
  const [regPhone, setRegPhone] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regProfession, setRegProfession] = useState("");

  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (regPassword !== regConfirm) {
      setError("Passwords do not match");
      return;
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const msg = await register({
        username: regUsername,
        name: regName,
        password: regPassword,
        role: regRole,
        phone: regPhone,
        address: regAddress,
        profession: regProfession,
      });
      setSuccess(msg);
      // Clear register form
      setRegUsername("");
      setRegName("");
      setRegPassword("");
      setRegConfirm("");
      setRegPhone("");
      setRegAddress("");
      setRegProfession("");
      // Switch to login after 2s
      setTimeout(() => {
        setMode("login");
        setSuccess("");
      }, 2500);
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const inputCls: React.CSSProperties = {
    width: "100%",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 14px 10px 38px",
    fontSize: 13,
    color: "#1e293b",
    background: "#f8fafc",
    outline: "none",
  };
  const selectCls: React.CSSProperties = {
    width: "100%",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 14px 10px 38px",
    fontSize: 13,
    color: "#1e293b",
    background: "#f8fafc",
    outline: "none",
    appearance: "auto",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #e0f2fe 0%, #e6fffa 50%, #f0fdf4 100%)",
      }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #14b8a6, transparent)",
          }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #0d3d3d, transparent)",
          }}
        />
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-4xl rounded-3xl overflow-hidden flex"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.15)", minHeight: 540 }}
      >
        {/* ── Left: Form ─────────────────────────────────────────────── */}
        <div
          className="flex-1 bg-white px-10 py-8 flex flex-col overflow-y-auto"
          style={{ minWidth: 340, maxHeight: "90vh" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #0d3d3d, #14b8a6)",
              }}
            >
              <FaAmbulance className="text-white text-base" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base leading-none">
                MediRoute
              </p>
              <p className="text-teal-500 text-xs">Douala Supply Chain</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-slate-400 text-sm mb-5">
            {mode === "login"
              ? "Sign in to access the supply system"
              : "Fill in your details to request access"}
          </p>

          {/* Tab switcher */}
          <div
            className="flex gap-2 mb-5 p-1 rounded-xl"
            style={{ background: "#f1f5f9" }}
          >
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                  setSuccess("");
                }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: mode === m ? "white" : "transparent",
                  color: mode === m ? "#0d3d3d" : "#94a3b8",
                  boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {m === "login" ? (
                  <FaSignInAlt size={11} />
                ) : (
                  <FaUserPlus size={11} />
                )}
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Success banner */}
          {success && (
            <div
              className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2"
              style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0" }}
            >
              <FaCheckCircle className="text-green-500 flex-shrink-0" />
              <div>
                <p className="text-green-700 text-xs font-semibold">
                  {success}
                </p>
                <p className="text-green-600 text-xs">
                  Redirecting to sign in…
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="rounded-xl px-4 py-2.5 mb-4 text-xs font-medium"
              style={{ background: "#fef2f2", color: "#dc2626" }}
            >
              {error}
            </div>
          )}

          {/* ── LOGIN FORM ─────────────────────────────────────────── */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="relative">
                <FaUser
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={12}
                />
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={inputCls}
                />
              </div>
              <div className="relative">
                <FaLock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={12}
                />
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...inputCls, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                >
                  {showPwd ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #0d3d3d, #14b8a6)",
                  marginTop: 8,
                }}
              >
                {loading ? (
                  <span className="animate-pulse">Signing in…</span>
                ) : (
                  <>
                    <FaSignInAlt size={13} /> Sign In
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ──────────────────────────────────────── */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-3">
              {/* Full name */}
              <div className="relative">
                <FaUser
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={12}
                />
                <input
                  type="text"
                  placeholder="Full name *"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  style={inputCls}
                />
              </div>

              {/* Username */}
              <div className="relative">
                <FaUser
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={12}
                />
                <input
                  type="text"
                  placeholder="Username *"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                  style={inputCls}
                />
              </div>

              {/* Role */}
              <div className="relative">
                <FaBriefcase
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={12}
                />
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  style={selectCls}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-400 -mt-1 pl-1">
                ⚠️ All new accounts start as <b>viewer</b>. A superadmin can
                upgrade your role.
              </p>

              {/* Profession */}
              <div className="relative">
                <FaBriefcase
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={12}
                />
                <input
                  type="text"
                  placeholder="Profession (e.g. Pharmacist, Nurse)"
                  value={regProfession}
                  onChange={(e) => setRegProfession(e.target.value)}
                  style={inputCls}
                />
              </div>

              {/* Phone */}
              <div className="relative">
                <FaPhone
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={12}
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  style={inputCls}
                />
              </div>

              {/* Address */}
              <div className="relative">
                <FaMapMarkerAlt
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={12}
                />
                <input
                  type="text"
                  placeholder="Address (e.g. Akwa, Douala)"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  style={inputCls}
                />
              </div>

              {/* Password */}
              <div className="relative">
                <FaLock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={12}
                />
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="Password *"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  style={{ ...inputCls, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                >
                  {showPwd ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                </button>
              </div>

              {/* Confirm password */}
              <div className="relative">
                <FaLock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                  size={12}
                />
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="Confirm password *"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  required
                  style={inputCls}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !!success}
                className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #0d3d3d, #14b8a6)",
                  marginTop: 8,
                }}
              >
                {loading ? (
                  <span className="animate-pulse">Creating account…</span>
                ) : (
                  <>
                    <FaUserPlus size={13} /> Create Account
                  </>
                )}
              </button>
            </form>
          )}

          <p className="text-xs text-slate-400 text-center mt-6">
            MediRoute © 2024 — Douala Medical Supply System
          </p>
        </div>

        {/* ── Right: Illustration ────────────────────────────────────── */}
        <div
          className="hidden md:flex flex-col items-center justify-center px-10 py-10 flex-1"
          style={{
            background:
              "linear-gradient(160deg, #0d3d3d 0%, #0f766e 60%, #14b8a6 100%)",
          }}
        >
          <div className="relative flex items-center justify-center mb-8">
            <div
              className="w-52 h-52 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1.5px solid rgba(255,255,255,0.15)",
              }}
            >
              <div
                className="w-36 h-36 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                }}
              >
                <FaAmbulance className="text-white" style={{ fontSize: 52 }} />
              </div>
            </div>
            {[
              { icon: FaHospital, top: "0%", left: "70%", size: 36 },
              { icon: FaPills, top: "70%", left: "75%", size: 32 },
              { icon: FaFlask, top: "75%", left: "5%", size: 32 },
              { icon: FaUser, top: "5%", left: "5%", size: 30 },
            ].map(({ icon: Icon, top, left, size }, i) => (
              <div
                key={i}
                className="absolute flex items-center justify-center rounded-2xl"
                style={{
                  top,
                  left,
                  width: size + 16,
                  height: size + 16,
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                <Icon
                  className="text-white"
                  style={{ fontSize: size * 0.55 }}
                />
              </div>
            ))}
          </div>

          <h2 className="text-white font-bold text-xl text-center mb-2">
            Douala Medical Supply
          </h2>
          <p className="text-teal-200 text-sm text-center leading-relaxed max-w-xs">
            Real-time routing and delivery management for medical supplies
            across all 5 arrondissements of Douala.
          </p>

          <div className="flex gap-6 mt-8">
            {[
              { label: "Facilities", value: "32" },
              { label: "Arrondissements", value: "5" },
              { label: "Routes", value: "Live" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-white font-bold text-lg">{value}</p>
                <p className="text-teal-300 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
