import { describe, expect, it } from "vitest";
import {
  appendDailyTurnoverHistory,
  buildHistoryEntryFromResponse,
  readDailyTurnoverHistory,
} from "@/lib/chief/dailyTurnoverHistory";
import type { DailyTurnoverApiResponse } from "@/lib/chief/dailyTurnoverTypes";
import {
  DAILY_TURNOVER_MOCK_MODE_NOTE,
  deriveTurnoverUnavailableState,
  formatSlackDeliveryStatus,
  historyIsEmpty,
  messagePreview,
  summarizeTurnoverCounts,
} from "@/lib/chief/dailyTurnoverView";

const responseFixture: DailyTurnoverApiResponse = {
  ok: true,
  generatedAt: "2026-07-20T12:00:00.000Z",
  message: "[TURNOVER] Chief daily turnover — sample\n\nApproved activity (24h): 2",
  summary: {
    generatedAt: "2026-07-20T12:00:00.000Z",
    windowHours: 24,
    counts: {
      approvedActivity24h: 2,
      failedOrBlocked24h: 1,
      pendingApprovals: null,
      pendingApprovalsNote: "not persisted server-side in V1 (use Chief Approvals UI)",
      queuedMissions: 0,
    },
    health: {
      vault: "configured",
      supabase: "configured",
      slackWebhook: "not configured",
      githubWebhook: "not configured",
      repoHealth: "not yet wired",
    },
    dataNotes: ["repo health not wired"],
  },
  slack: {
    configured: false,
    attempted: false,
  },
};

describe("dailyTurnoverView", () => {
  it("shows demo-mode unavailable state", () => {
    const state = deriveTurnoverUnavailableState({
      liveApi: false,
      loading: false,
      error: null,
    });

    expect(state?.headline).toMatch(/demo mode/i);
    expect(state?.detail).toBe(DAILY_TURNOVER_MOCK_MODE_NOTE);
  });

  it("formats slack delivery honestly when webhook is unset", () => {
    expect(formatSlackDeliveryStatus({ configured: false, attempted: false })).toMatch(
      /not configured/i,
    );
    expect(formatSlackDeliveryStatus({ configured: true, attempted: true })).toMatch(/attempted/i);
  });

  it("summarizes counts and previews long messages", () => {
    expect(summarizeTurnoverCounts(responseFixture.summary.counts)).toContain("2 approved");
    expect(messagePreview("a ".repeat(120), 20).endsWith("…")).toBe(true);
  });
});

describe("dailyTurnoverHistory", () => {
  it("stores and reads session history with a limit", () => {
    const storage = new Map<string, string>();
    const session = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };

    expect(historyIsEmpty(readDailyTurnoverHistory(session))).toBe(true);

    const entry = buildHistoryEntryFromResponse(responseFixture, "2026-07-20T12:01:00.000Z");
    appendDailyTurnoverHistory(entry, session);

    const history = readDailyTurnoverHistory(session);
    expect(history).toHaveLength(1);
    expect(history[0]?.message).toContain("[TURNOVER]");
  });
});
