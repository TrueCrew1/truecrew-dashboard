import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAuthMock,
  collectDailyTurnoverSnapshotMock,
  governedLoopSlackMock,
} = vi.hoisted(() => ({
  requireInternalAuthMock: vi.fn(),
  collectDailyTurnoverSnapshotMock: vi.fn(),
  governedLoopSlackMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  requireInternalAuth: requireInternalAuthMock,
}));

vi.mock("../lib/chief/collectDailyTurnoverSnapshot.js", () => ({
  collectDailyTurnoverSnapshot: collectDailyTurnoverSnapshotMock,
}));

vi.mock("../lib/governedLoopSlack.js", () => ({
  governedLoopSlack: governedLoopSlackMock,
}));

import handler from "../api/chief/approvals/index.js";

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    setHeader: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

const snapshotFixture = {
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
    slackWebhook: "configured",
    githubWebhook: "not configured",
    repoHealth: "not yet wired",
  },
  dataNotes: [],
};

describe("POST /api/chief/daily-turnover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAuthMock.mockReturnValue(true);
    collectDailyTurnoverSnapshotMock.mockResolvedValue(snapshotFixture);
    governedLoopSlackMock.mockResolvedValue(undefined);
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.test/turnover";
  });

  it("builds turnover, posts to Slack, and returns summary", async () => {
    const req = {
      method: "POST",
      query: { view: "daily-turnover" },
    } as VercelRequest;
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(collectDailyTurnoverSnapshotMock).toHaveBeenCalledTimes(1);
    expect(governedLoopSlackMock).toHaveBeenCalledTimes(1);
    expect(governedLoopSlackMock.mock.calls[0]?.[0]).toContain("[TURNOVER]");
    expect(res.body).toMatchObject({
      ok: true,
      generatedAt: snapshotFixture.generatedAt,
      summary: snapshotFixture,
      slack: {
        configured: true,
        attempted: true,
      },
    });
  });

  it("returns success without Slack when webhook is unset", async () => {
    delete process.env.SLACK_WEBHOOK_URL;

    const req = {
      method: "GET",
      query: { view: "daily-turnover" },
    } as VercelRequest;
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(governedLoopSlackMock).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      ok: true,
      slack: {
        configured: false,
        attempted: false,
      },
    });
  });
});
