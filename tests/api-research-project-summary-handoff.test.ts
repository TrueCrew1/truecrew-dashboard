import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAuthMock,
  isSupabaseConfiguredMock,
  isVaultConfiguredMock,
  getChiefApprovalDecisionMock,
  executeProjectSummaryHandoffMock,
  readProjectSummaryHandoffMissionByProposalMock,
  listProjectSummaryHandoffMissionsMock,
} = vi.hoisted(() => ({
  requireInternalAuthMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
  isVaultConfiguredMock: vi.fn(),
  getChiefApprovalDecisionMock: vi.fn(),
  executeProjectSummaryHandoffMock: vi.fn(),
  readProjectSummaryHandoffMissionByProposalMock: vi.fn(),
  listProjectSummaryHandoffMissionsMock: vi.fn(),
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
  getChiefApprovalDecision: getChiefApprovalDecisionMock,
  isChiefApprovalStatus: (value: string) =>
    ["approved", "rejected", "sent_back"].includes(value),
}));

vi.mock("../lib/research/projectSummaryHandoff.js", () => ({
  executeProjectSummaryHandoff: executeProjectSummaryHandoffMock,
}));

vi.mock("../lib/missions/projectSummaryHandoffStore.js", () => ({
  readProjectSummaryHandoffMissionByProposal: readProjectSummaryHandoffMissionByProposalMock,
  listProjectSummaryHandoffMissions: listProjectSummaryHandoffMissionsMock,
}));

import handler from "../api/research/project-summary-handoff.js";

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  setHeader(name: string, value: string): void;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function createMockRequest(
  overrides: Partial<VercelRequest> & { body?: unknown; query?: Record<string, string> } = {},
): VercelRequest {
  return {
    method: "POST",
    headers: {},
    body: {},
    query: {},
    ...overrides,
  } as VercelRequest;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
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

const mission = {
  id: "psh-1",
  kind: "research:project-summary-handoff" as const,
  status: "completed" as const,
  projectId: "wf-001",
  projectTitle: "Billing API v2.4.1 build",
  proposalId: "apr-research-psh-abc",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  requireInternalAuthMock.mockReturnValue(true);
  isSupabaseConfiguredMock.mockReturnValue(true);
  isVaultConfiguredMock.mockReturnValue(true);
  getChiefApprovalDecisionMock.mockResolvedValue({ status: "approved" });
  executeProjectSummaryHandoffMock.mockResolvedValue(mission);
  listProjectSummaryHandoffMissionsMock.mockReturnValue([mission]);
  readProjectSummaryHandoffMissionByProposalMock.mockReturnValue(mission);
});

describe("/api/research/project-summary-handoff", () => {
  it("returns early when auth fails", async () => {
    requireInternalAuthMock.mockReturnValue(false);
    const req = createMockRequest();
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(executeProjectSummaryHandoffMock).not.toHaveBeenCalled();
  });

  it("returns 409 when approval is missing", async () => {
    getChiefApprovalDecisionMock.mockResolvedValue(null);
    const req = createMockRequest({
      body: { proposalId: mission.proposalId, projectId: mission.projectId },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(409);
    expect(executeProjectSummaryHandoffMock).not.toHaveBeenCalled();
  });

  it("executes when approval exists", async () => {
    const req = createMockRequest({
      body: { proposalId: mission.proposalId, projectId: mission.projectId },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(executeProjectSummaryHandoffMock).toHaveBeenCalledWith({
      proposalId: mission.proposalId,
      projectId: mission.projectId,
    });
  });

  it("lists missions on GET", async () => {
    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(listProjectSummaryHandoffMissionsMock).toHaveBeenCalled();
  });
});
