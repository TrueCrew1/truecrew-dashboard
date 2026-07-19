import { describe, expect, it } from "vitest";
import type { PlatformHealthState } from "@/types/monitor";
import {
  deriveMonitorApprovalCards,
  MONITOR_PLATFORM_APPROVAL_ID,
} from "@/components/chief/monitorApprovalCards";

function healthState(overrides: Partial<PlatformHealthState> = {}): PlatformHealthState {
  return {
    vercel: { data: null, loading: false, error: null },
    supabase: { data: null, loading: false, error: null },
    ...overrides,
  };
}

describe("deriveMonitorApprovalCards", () => {
  it("returns no cards in mock mode", () => {
    expect(
      deriveMonitorApprovalCards({
        liveApiEnabled: false,
        platformHealth: healthState({
          vercel: {
            data: { ok: false, recent: [], error: "Vercel monitor is not configured" },
            loading: false,
            error: null,
          },
        }),
      }),
    ).toEqual([]);
  });

  it("returns no cards when platform is healthy", () => {
    const cards = deriveMonitorApprovalCards({
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

    expect(cards).toEqual([]);
  });

  it("returns no cards while probes are loading", () => {
    const cards = deriveMonitorApprovalCards({
      liveApiEnabled: true,
      platformHealth: healthState({
        vercel: { data: null, loading: true, error: null },
      }),
    });

    expect(cards).toEqual([]);
  });

  it("creates one approval card for a Vercel issue", () => {
    const cards = deriveMonitorApprovalCards({
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
      createdAt: "2026-07-19T12:00:00.000Z",
    });

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe(MONITOR_PLATFORM_APPROVAL_ID);
    expect(cards[0].title).toBe("Platform monitor: Vercel degraded");
    expect(cards[0].summary).toContain("Vercel:");
    expect(cards[0].status).toBe("pending");
    expect(cards[0].routeTo).toBe("/monitor");
  });

  it("creates one approval card for a Supabase issue", () => {
    const cards = deriveMonitorApprovalCards({
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

    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("Platform monitor: Supabase degraded");
    expect(cards[0].summary).toContain("Supabase:");
  });

  it("creates one combined card when both probes report issues", () => {
    const cards = deriveMonitorApprovalCards({
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

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe(MONITOR_PLATFORM_APPROVAL_ID);
    expect(cards[0].title).toBe("Platform monitor: multiple issues");
    expect(cards[0].summary).toContain("Vercel:");
    expect(cards[0].summary).toContain("Supabase:");
  });

  it("dedupes to a stable card id across repeated derivations", () => {
    const input = {
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
    };

    const first = deriveMonitorApprovalCards(input);
    const second = deriveMonitorApprovalCards(input);

    expect(first[0]?.id).toBe(second[0]?.id);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
  });

  it("returns no card when probes are unavailable without a confirmed issue", () => {
    const cards = deriveMonitorApprovalCards({
      liveApiEnabled: true,
      platformHealth: healthState(),
    });

    expect(cards).toEqual([]);
  });
});
