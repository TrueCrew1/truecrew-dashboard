import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isSupabaseConfigured } from "./supabase/admin.js";

/**
 * Extracts a human-readable message from an unknown thrown value.
 *
 * Every API handler's catch block needs the same guard against non-Error
 * throws; this centralizes it so callers write `errorMessage(error)` instead
 * of repeating the `instanceof Error` ternary.
 */
export function errorMessage(error: unknown, fallback = "Unknown error"): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Guards a route that needs Supabase. Returns true when configured; otherwise
 * sends a 503 and returns false, matching the `requireInternalAuth` guard
 * pattern in `lib/auth.ts`.
 */
export function requireSupabase(res: VercelResponse): boolean {
  if (isSupabaseConfigured()) return true;
  res.status(503).json({ error: "Database not configured" });
  return false;
}

/**
 * Guards a route by HTTP method. Returns true when the request method is
 * allowed; otherwise sets the `Allow` header, sends a 405, and returns false.
 */
export function requireMethod(
  req: VercelRequest,
  res: VercelResponse,
  allowed: string | string[],
): boolean {
  const methods = Array.isArray(allowed) ? allowed : [allowed];
  if (req.method && methods.includes(req.method)) return true;
  res.setHeader("Allow", methods.join(", "));
  res.status(405).json({ error: "Method not allowed" });
  return false;
}
