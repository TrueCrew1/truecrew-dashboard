import type { VercelRequest } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAuthMock,
  isSupabaseConfiguredMock,
  isVaultConfiguredMock,
  getChiefApprovalDecisionMock,
  executeMonitorIncidentPostmortemMock,
  readMonitorIncidentPostmortemMissionByProposalMock,
  listMonitorIncidentPostmortemMissionsMock,
} = vi.hoisted(() => ({
  requireInternalAuthMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
  isVaultConfiguredMock: vi.fn(),
  getChiefApprovalDecisionMock: vi.fn(),
  executeMonitorIncidentPostmortemMock: vi.fn(),
  readMonitorIncidentPostmortemMissionByProposalMock: vi.fn(),
  listMonitorIncidentPostmortemMissionsMock: vi.fn(),
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
}));

vi.mock("../lib/research/monitorIncidentPostmortem.js", () => ({
  executeMonitorIncidentPostmortem: executeMonitorIncidentPostmortemMock,
}));

vi.mock("../lib/missions/monitorIncidentPostmortemStore.js", () => ({
  readMonitorIncidentPostmortemMissionByProposal: readMonitorIncidentPostmortemMissionByProposalMock,
  listMonitorIncidentPostmortemMissions: listMonitorIncidentPostmortemMissionsMock,
}));

import handler from "../api/research/[kind].js";

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
    query: { kind: "monitor-incident-postmortem" },
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
  id: "mip-1",
  kind: "research:monitor-incident-postmortem" as const,
  status: "completed" as const,
  incidentId: "inc-001",
  incidentTitle: "Auth latency spike",
  serviceName: "Auth API",
  proposalId: "apr-research-incident-abc",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("POST /api/research/monitor-incident-postmortem", () => {
  beforeEach(() => {
    requireInternalAuthMock.mockReturnValue(true);
    isSupabaseConfiguredMock.mockReturnValue(true);
    isVaultConfiguredMock.mockReturnValue(true);
    getChiefApprovalDecisionMock.mockResolvedValue({ status: "approved" });
    executeMonitorIncidentPostmortemMock.mockResolvedValue(mission);
  });

  it("runs mission when decision is approved", async () => {
    const req = createMockRequest({
      body: {
        proposalId: mission.proposalId,
        incidentId: mission.incidentId,
        missionKind: mission.kind,
      },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(executeMonitorIncidentPostmortemMock).toHaveBeenCalledWith({
      proposalId: mission.proposalId,
      incidentId: mission.incidentId,
    });
  });

  it("returns 409 when decision is not approved", async () => {
    getChiefApprovalDecisionMock.mockResolvedValue({ status: "pending" });
    const req = createMockRequest({
      body: { proposalId: mission.proposalId, incidentId: mission.incidentId },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(409);
  });
});
