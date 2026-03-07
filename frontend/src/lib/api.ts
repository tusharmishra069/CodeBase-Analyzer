/**
 * Centralised API fetch helper.
 *
 * - Always sends the correct base URL (env var or localhost fallback).
 * - Always attaches the X-API-Key header so the backend auth guard passes.
 * - Throws on non-2xx responses with the backend's `detail` message.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_KEY  = process.env.NEXT_PUBLIC_API_KEY  || "";

export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (API_KEY) {
    headers.set("X-API-Key", API_KEY);
  }

  return fetch(`${API_BASE}${path}`, { ...init, headers });
}
