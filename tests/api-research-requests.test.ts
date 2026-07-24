import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAuthMock,
  isSupabaseConfiguredMock,
  fetchResearchRequestsMock,
  getResearchRequestMock,
  updateResearchRequestStatusMock,
  insertResearchRequestMock,
} = vi.hoisted(() => ({
  requireInternalAuthMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
  fetchResearchRequestsMock: vi.fn(),
  getResearchRequestMock: vi.fn(),
  updateResearchRequestStatusMock: vi.fn(),
  insertResearchRequestMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  requireInternalAuth: requireInternalAuthMock,
}));

vi.mock("../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

vi.mock("../lib/obsidian/config.js", () => ({
  isVaultConfigured: vi.fn(() => false),
}));

vi.mock("../lib/supabase/queries.js", () => ({
  fetchResearchRequests: fetchResearchRequestsMock,
  getResearchRequest: getResearchRequestMock,
  updateResearchRequestStatus: updateResearchRequestStatusMock,
  insertResearchRequest: insertResearchRequestMock,
  getChiefApprovalDecision: vi.fn(),
}));

vi.mock("../lib/research/projectSummaryHandoff.js", () => ({
  executeProjectSummaryHandoff: vi.fn(),
}));

vi.mock("../lib/research/monitorIncidentPostmortem.js", () => ({
  executeMonitorIncidentPostmortem: vi.fn(),
}));

vi.mock("../lib/missions/projectSummaryHandoffStore.js", () => ({
  readProjectSummaryHandoffMissionByProposal: vi.fn(),
  listProjectSummaryHandoffMissions: vi.fn(() => []),
}));

vi.mock("../lib/missions/monitorIncidentPostmortemStore.js", () => ({
  readMonitorIncidentPostmortemMissionByProposal: vi.fn(),
  listMonitorIncidentPostmortemMissions: vi.fn(() => []),
}));

import handler from "../api/research/dispatch.js";

interface MockResponse {
  statusCode: number;
  body: unknown;
  setHeader(): void;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function createMockRequest(
  overrides: Partial<VercelRequest> & { body?: unknown; query?: Record<string, string> } = {},
): VercelRequest {
  return {
    method: "GET",
    headers: {},
    body: {},
    query: {},
    ...overrides,
  } as VercelRequest;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    setHeader() {},
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

const dbRow = {
  id: "req-ms-painting-v2-market-scan",
  topic: "Painter SaaS market scan",
  why_it_matters: "Ground V2",
  suggested_outcome: "Findings note",
  source: "adapter" as const,
  status: "queued" as const,
  filed_path: null,
  blocker_note: null,
  created_at: "2026-07-22T13:00:00.000Z",
  updated_at: "2026-07-22T13:00:00.000Z",
};

describe("/api/research request queue", () => {
  beforeEach(() => {
    requireInternalAuthMock.mockImplementation(() => true);
    isSupabaseConfiguredMock.mockReturnValue(true);
    fetchResearchRequestsMock.mockReset();
    getResearchRequestMock.mockReset();
    updateResearchRequestStatusMock.mockReset();
    insertResearchRequestMock.mockReset();
  });

  it("GET lists client-shaped requests", async () => {
    fetchResearchRequestsMock.mockResolvedValue([dbRow]);
    const res = createMockResponse();
    await handler(createMockRequest({ method: "GET" }), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);
    const body = res.body as { requests: Array<{ id: string; whyItMatters: string; status: string }> };
    expect(body.requests).toHaveLength(1);
    expect(body.requests[0]).toMatchObject({
      id: dbRow.id,
      whyItMatters: "Ground V2",
      status: "queued",
    });
  });

  it("PATCH queued → in_progress persists and returns client shape", async () => {
    getResearchRequestMock.mockResolvedValue(dbRow);
    updateResearchRequestStatusMock.mockResolvedValue({
      ...dbRow,
      status: "in_progress",
      updated_at: "2026-07-22T14:00:00.000Z",
    });
    const res = createMockResponse();
    await handler(
      createMockRequest({
        method: "PATCH",
        query: { id: dbRow.id },
        body: { status: "in_progress" },
      }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(200);
    expect(updateResearchRequestStatusMock).toHaveBeenCalledWith(dbRow.id, "in_progress", {
      filedPath: undefined,
      blockerNote: undefined,
    });
    const body = res.body as { request: { status: string; id: string } };
    expect(body.request).toMatchObject({ id: dbRow.id, status: "in_progress" });
  });

  it("PATCH rejects invalid transition queued → done", async () => {
    getResearchRequestMock.mockResolvedValue(dbRow);
    const res = createMockResponse();
    await handler(
      createMockRequest({
        method: "PATCH",
        query: { id: dbRow.id },
        body: { status: "done", filedPath: "knowledge/findings/x.md" },
      }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(409);
    expect(updateResearchRequestStatusMock).not.toHaveBeenCalled();
  });

  it("returns 503 when database is not configured", async () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    const res = createMockResponse();
    await handler(createMockRequest({ method: "GET" }), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(503);
  });
});
