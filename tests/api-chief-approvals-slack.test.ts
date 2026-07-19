import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAuthMock,
  isSupabaseConfiguredMock,
  insertChiefApprovalDecisionMock,
  isVaultConfiguredMock,
  scheduleGovernedApprovalUpdatedSlackMock,
} = vi.hoisted(() => ({
  requireInternalAuthMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
  insertChiefApprovalDecisionMock: vi.fn(),
  isVaultConfiguredMock: vi.fn(),
  scheduleGovernedApprovalUpdatedSlackMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  requireInternalAuth: requireInternalAuthMock,
}));

vi.mock("../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

vi.mock("../lib/obsidian/config.js", () => ({
  isVaultConfigured: isVaultConfiguredMock,
}));

vi.mock("../lib/supabase/queries.js", () => ({
  fetchChiefApprovalDecisions: vi.fn(),
  insertChiefApprovalDecision: insertChiefApprovalDecisionMock,
  isChiefApprovalStatus: (value: string) =>
    ["approved", "rejected", "sent_back"].includes(value),
}));

vi.mock("../lib/mappers/chief-approvals.js", () => ({
  mapDbChiefApprovalDecisionToClient: (row: {
    proposal_id: string;
    status: string;
    decided_at: string;
    actor: null;
  }) => ({
    proposalId: row.proposal_id,
    status: row.status,
    decidedAt: row.decided_at,
    actor: row.actor,
  }),
}));

vi.mock("../lib/governedLoopSlack.js", () => ({
  scheduleGovernedApprovalUpdatedSlack: scheduleGovernedApprovalUpdatedSlackMock,
}));

import handler from "../api/chief/approvals/index.js";

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
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

describe("POST /api/chief/approvals Slack hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAuthMock.mockReturnValue(true);
    isSupabaseConfiguredMock.mockReturnValue(true);
    isVaultConfiguredMock.mockReturnValue(false);
    insertChiefApprovalDecisionMock.mockResolvedValue({
      created: true,
      row: {
        proposal_id: "apr-research-psh-abc",
        status: "approved",
        decided_at: "2026-01-01T00:00:00.000Z",
        actor: null,
      },
    });
  });

  it("schedules governed approval updated Slack after a new decision", async () => {
    const req = {
      method: "POST",
      query: {},
      body: {
        proposalId: "apr-research-psh-abc",
        status: "approved",
        activity: {
          title: "Handoff",
          summary: "Summary",
          missionKind: "research:project-summary-handoff",
          missionProjectId: "wf-1",
        },
      },
    } as VercelRequest;
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(201);
    expect(scheduleGovernedApprovalUpdatedSlackMock).toHaveBeenCalledWith({
      approvalId: "apr-research-psh-abc",
      status: "approved",
      missionKind: "research:project-summary-handoff",
      missionProjectId: "wf-1",
    });
  });
});
