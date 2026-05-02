"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

export const API = "http://localhost:8000";

export interface AuthUser {
  username: string;
  name: string;
  role: "superadmin" | "admin" | "dispatcher" | "viewer";
  token: string;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  superadmin: [
    "read",
    "dispatch",
    "block_roads",
    "manage_inventory",
    "manage_users",
  ],
  admin: ["read", "dispatch", "block_roads", "manage_inventory"],
  dispatcher: ["read", "dispatch"],
  viewer: ["read"],
};

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<string>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export interface RegisterData {
  username: string;
  name: string;
  password: string;
  role: string;
  phone: string;
  address: string;
  profession: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  function saveUser(u: AuthUser) {
    setUser(u);
    localStorage.setItem("mediroute_user", JSON.stringify(u));
  }

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("mediroute_user");
  }, []);

  // Restore session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mediroute_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.token) setUser(parsed);
      }
    } catch {}
    setLoading(false);
  }, []);

  // Listen for 401s globally — auto-logout on expired token
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 401) {
        // Clone so caller can still read body
        const cloned = res.clone();
        const data = await cloned.json().catch(() => ({}));
        // Only logout for real token errors, not "No token" from our guard
        if (data?.detail && data.detail !== "No token") {
          logout();
        }
      }
      return res;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [logout]);

  async function login(username: string, password: string) {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Login failed");
    saveUser({
      username,
      name: data.name,
      role: data.role,
      token: data.access_token,
    });
  }

  async function register(body: RegisterData): Promise<string> {
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Registration failed");
    return data.message ?? "Account created successfully";
  }

  function hasPermission(permission: string): boolean {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
