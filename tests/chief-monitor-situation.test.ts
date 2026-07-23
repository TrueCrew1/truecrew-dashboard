import { describe, expect, it } from "vitest";
import type { PlatformHealthState } from "@/types/monitor";
import { deriveChiefSituationBriefFromMonitor } from "@/components/chief/chiefMonitorSituation";

function healthState(
  overrides: Partial<PlatformHealthState> = {},
): PlatformHealthState {
  return {
    vercel: { data: null, loading: false, error: null },
    supabase: { data: null, loading: false, error: null },
    ...overrides,
  };
}

describe("deriveChiefSituationBriefFromMonitor", () => {
  it("labels mock mode as non-live", () => {
    const brief = deriveChiefSituationBriefFromMonitor({ liveApiEnabled: false });
    expect(brief.tone).toBe("mock");
    expect(brief.headline).toContain("not live");
  });

  it("reports loading while probes are in flight", () => {
    const brief = deriveChiefSituationBriefFromMonitor({
      liveApiEnabled: true,
      platformHealth: healthState({
        vercel: { data: null, loading: true, error: null },
      }),
    });

    expect(brief.tone).toBe("loading");
    expect(brief.headline).toContain("Checking");
  });

  it("reports healthy when both probes are OK", () => {
    const brief = deriveChiefSituationBriefFromMonitor({
      liveApiEnabled: true,
      platformHealth: healthState({
        vercel: {
          data: { ok: true, recent: [], latest: { state: "READY", createdAt: "", url: "" } },
          loading: false,
          error: null,
        },
        supabase: {
          data: { ok: true, db_reachable: true },
          loading: false,
          error: null,
        },
      }),
    });

    expect(brief.tone).toBe("healthy");
    expect(brief.headline).toBe("Platform healthy");
  });

  it("surfaces Vercel degradation first", () => {
    const brief = deriveChiefSituationBriefFromMonitor({
      liveApiEnabled: true,
      platformHealth: healthState({
        vercel: {
          data: { ok: false, recent: [], error: "Vercel monitor is not configured" },
          loading: false,
          error: null,
        },
        supabase: {
          data: { ok: true, db_reachable: true },
          loading: false,
          error: null,
        },
      }),
    });

    expect(brief.tone).toBe("degraded");
    expect(brief.headline).toBe("Vercel degraded");
  });

  it("maps soft/dev non-JSON probe failures to unavailable (not degraded parse noise)", () => {
    const soft =
      "Endpoint not wired in this dev mode (/api/monitor). Use vercel dev (or disable VITE_USE_LIVE_API) for live JSON APIs.";
    const brief = deriveChiefSituationBriefFromMonitor({
      liveApiEnabled: true,
      platformHealth: healthState({
        vercel: { data: null, loading: false, error: soft },
        supabase: { data: null, loading: false, error: soft },
      }),
    });

    expect(brief.tone).toBe("unavailable");
    expect(brief.headline).toMatch(/unavailable in this dev mode/i);
    expect(brief.detail ?? "").not.toMatch(/Unexpected token/i);
  });

  it("surfaces Supabase degradation", () => {
    const brief = deriveChiefSituationBriefFromMonitor({
      liveApiEnabled: true,
      platformHealth: healthState({
        vercel: {
          data: { ok: true, recent: [], latest: { state: "READY", createdAt: "", url: "" } },
          loading: false,
          error: null,
        },
        supabase: {
          data: { ok: true, db_reachable: false },
          loading: false,
          error: null,
        },
      }),
    });

    expect(brief.tone).toBe("degraded");
    expect(brief.headline).toBe("Supabase degraded");
  });

  it("combines multiple platform issues", () => {
    const brief = deriveChiefSituationBriefFromMonitor({
      liveApiEnabled: true,
      platformHealth: healthState({
        vercel: {
          data: { ok: false, recent: [], error: "Vercel monitor is not configured" },
          loading: false,
          error: null,
        },
        supabase: {
          data: { ok: false, message: "Database not configured" },
          loading: false,
          error: null,
        },
      }),
    });

    expect(brief.tone).toBe("degraded");
    expect(brief.headline).toBe("Multiple platform issues");
    expect(brief.allIssues).toHaveLength(2);
  });

  it("does not claim healthy when probes return no data", () => {
    const brief = deriveChiefSituationBriefFromMonitor({
      liveApiEnabled: true,
      platformHealth: healthState(),
    });

    expect(brief.tone).toBe("unavailable");
    expect(brief.headline).not.toContain("healthy");
  });
});
