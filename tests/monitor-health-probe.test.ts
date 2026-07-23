import { describe, expect, it } from "vitest";
import { resolveMonitorProbeResult } from "@/hooks/useMonitorHealth";

describe("resolveMonitorProbeResult", () => {
  it("surfaces an actionable auth hint on 401 Unauthorized", () => {
    const resolved = resolveMonitorProbeResult(
      { ok: false, status: 401 },
      { error: "Unauthorized" },
      "fallback",
    );
    expect(resolved.data).toBeNull();
    expect(resolved.error).toMatch(/VITE_INTERNAL_KEY/);
    expect(resolved.error).toMatch(/INTERNAL_API_SECRET/);
  });

  it("keeps vercel not-configured errors from a 200 ok:false body", () => {
    const resolved = resolveMonitorProbeResult(
      { ok: true, status: 200 },
      {
        ok: false,
        error:
          "Vercel monitor is not configured — set VERCEL_API_TOKEN and VERCEL_PROJECT_ID in the deployment environment",
        recent: [],
      },
      "fallback",
    );
    expect(resolved.error).toMatch(/VERCEL_API_TOKEN/);
    expect(resolved.data?.ok).toBe(false);
  });

  it("accepts a healthy supabase probe", () => {
    const resolved = resolveMonitorProbeResult(
      { ok: true, status: 200 },
      {
        ok: true,
        db_reachable: true,
        connection_count: 3,
        active_connections: 1,
      },
      "fallback",
    );
    expect(resolved.error).toBeNull();
    expect(resolved.data?.ok).toBe(true);
  });

  it("maps non-ok HTTP with body error text", () => {
    const resolved = resolveMonitorProbeResult(
      { ok: false, status: 503 },
      { error: "Database not configured" },
      "fallback",
    );
    expect(resolved.data).toBeNull();
    expect(resolved.error).toBe("Database not configured");
  });
});
