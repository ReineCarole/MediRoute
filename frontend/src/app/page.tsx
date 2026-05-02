"use client";

import dynamic from "next/dynamic";
import { AuthProvider, useAuth } from "@/components/auth/Authcontext";

const AppShell = dynamic(() => import("@/components/AppShell"), { ssr: false });
const LoginPage = dynamic(() => import("@/components/auth/Loginpage"), {
  ssr: false,
});

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #e0f2fe, #e6fffa)" }}
      >
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "linear-gradient(135deg, #0d3d3d, #14b8a6)" }}
          >
            <span className="text-white text-xl">🚑</span>
          </div>
          <p className="text-slate-500 text-sm animate-pulse">
            Loading MediRoute…
          </p>
        </div>
      </div>
    );
  }

  return user ? <AppShell /> : <LoginPage />;
}

export default function Home() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
