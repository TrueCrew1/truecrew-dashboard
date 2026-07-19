import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAuthMock,
  scheduleGovernedApprovalCreatedSlackMock,
  governedLoopSlackMock,
} = vi.hoisted(() => ({
  requireInternalAuthMock: vi.fn(),
  scheduleGovernedApprovalCreatedSlackMock: vi.fn(),
  governedLoopSlackMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  requireInternalAuth: requireInternalAuthMock,
}));

vi.mock("../lib/governedLoopSlack.js", () => ({
  scheduleGovernedApprovalCreatedSlack: scheduleGovernedApprovalCreatedSlackMock,
  governedLoopSlack: governedLoopSlackMock,
  isGovernedChiefApproval: (input: { proposalId: string; missionKind?: string }) =>
    Boolean(input.missionKind) || input.proposalId.startsWith("apr-monitor-platform-"),
  formatMonitorStateMessage: (input: {
    state: string;
    probeId: string;
    incidentId?: string;
  }) =>
    `Monitor state: ${input.state} (probe=${input.probeId}, incident=${input.incidentId ?? "none"}).`,
}));

import handler from "../api/chief/governed-slack-notify.js";

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

describe("POST /api/chief/governed-slack-notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAuthMock.mockReturnValue(true);
    governedLoopSlackMock.mockResolvedValue(undefined);
  });

  it("schedules approval created Slack for governed approvals", async () => {
    const req = {
      method: "POST",
      body: {
        event: "approval_created",
        approvalId: "apr-research-psh-abc",
        missionKind: "research:project-summary-handoff",
        missionProjectId: "wf-1",
      },
    } as VercelRequest;
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(scheduleGovernedApprovalCreatedSlackMock).toHaveBeenCalledWith({
      approvalId: "apr-research-psh-abc",
      missionKind: "research:project-summary-handoff",
      missionProjectId: "wf-1",
    });
  });

  it("posts monitor state Slack messages", async () => {
    const req = {
      method: "POST",
      body: {
        event: "monitor_state",
        state: "degraded",
        probeId: "vercel",
      },
    } as VercelRequest;
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(governedLoopSlackMock).toHaveBeenCalledWith(
      "Monitor state: degraded (probe=vercel, incident=none).",
    );
  });
});
