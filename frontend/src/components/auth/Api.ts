export const API = "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("mediroute_user");
    if (!stored) return null;
    return JSON.parse(stored)?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * All API calls go through here.
 * Automatically injects Authorization header.
 * Returns a fake 401 locally if no token — avoids polluting backend logs.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();

  if (!token) {
    return new Response(JSON.stringify({ detail: "No token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build headers — always include Authorization
  const incoming = (options.headers ?? {}) as Record<string, string>;
  const headers: Record<string, string> = {
    ...incoming,
    Authorization: `Bearer ${token}`,
  };

  // Set Content-Type for string bodies that don't already specify it
  if (
    options.body &&
    typeof options.body === "string" &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  return window.fetch(`${API}${path}`, { ...options, headers });
}

/**
 * Convenience wrapper for JSON POST/PATCH requests.
 * Always serializes body and sets Content-Type.
 */
export async function apiPost(
  path: string,
  body: Record<string, any>,
  method: "POST" | "PATCH" | "PUT" = "POST",
): Promise<Response> {
  const token = getToken();

  if (!token) {
    return new Response(JSON.stringify({ detail: "No token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return window.fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}
