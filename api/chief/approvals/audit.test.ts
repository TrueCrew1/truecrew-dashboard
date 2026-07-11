import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { isSupabaseConfiguredMock, fetchChiefApprovalAuditEventsMock } = vi.hoisted(() => ({
  isSupabaseConfiguredMock: vi.fn(),
  fetchChiefApprovalAuditEventsMock: vi.fn(),
}));

vi.mock("../../../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
  fetchChiefApprovalAuditEvents: fetchChiefApprovalAuditEventsMock,
}));

import handler from "./audit.js";

const INTERNAL_SECRET = "test-internal-secret";

interface MockResponse {
  statusCode: number;
  body: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function createMockRequest(
  overrides: Partial<VercelRequest> & { headers?: Record<string, string> } = {},
): VercelRequest {
  const { headers = {}, ...rest } = overrides;
  return {
    method: "GET",
    headers,
    query: {},
    ...rest,
  } as VercelRequest;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
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

function authorizedHeaders(): Record<string, string> {
  return { "x-internal-key": INTERNAL_SECRET };
}

function auditRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "evt-1",
    entity_type: "chief_approval_decision",
    entity_id: "apr-1",
    action: "chief.approval.approved",
    actor: "operator",
    details: { status: "approved", decidedAt: "2026-07-08T00:00:00.000Z" },
    created_at: "2026-07-08T00:00:01.000Z",
    ...overrides,
  };
}

describe("/api/chief/approvals/audit", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", INTERNAL_SECRET);
    isSupabaseConfiguredMock.mockReturnValue(true);
    fetchChiefApprovalAuditEventsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns 401 without internal auth", async () => {
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(401);
    expect(fetchChiefApprovalAuditEventsMock).not.toHaveBeenCalled();
  });

  it("returns 503 when Supabase is not configured", async () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    const req = createMockRequest({ headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: "Database not configured" });
  });

  it("returns 405 for an unsupported HTTP method (this route is read-only)", async () => {
    const req = createMockRequest({ method: "POST", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(405);
    expect(fetchChiefApprovalAuditEventsMock).not.toHaveBeenCalled();
  });

  it("defaults to a limit of 50 when none is given", async () => {
    const req = createMockRequest({ headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(fetchChiefApprovalAuditEventsMock).toHaveBeenCalledWith(50);
  });

  it("clamps a requested limit to the 1-100 range", async () => {
    const req = createMockRequest({ headers: authorizedHeaders(), query: { limit: "500" } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(fetchChiefApprovalAuditEventsMock).toHaveBeenCalledWith(100);
  });

  it("maps rows to the stable client shape, using details.status and details.decidedAt", async () => {
    fetchChiefApprovalAuditEventsMock.mockResolvedValue([auditRow()]);
    const req = createMockRequest({ headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      events: [
        {
          id: "evt-1",
          proposalId: "apr-1",
          action: "chief.approval.approved",
          status: "approved",
          actor: "operator",
          decidedAt: "2026-07-08T00:00:00.000Z",
          createdAt: "2026-07-08T00:00:01.000Z",
        },
      ],
    });
  });

  it("falls back to created_at when details.decidedAt is missing, and null status when details.status is missing", async () => {
    fetchChiefApprovalAuditEventsMock.mockResolvedValue([auditRow({ details: {} })]);
    const req = createMockRequest({ headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.body).toEqual({
      events: [
        expect.objectContaining({
          status: null,
          decidedAt: "2026-07-08T00:00:01.000Z",
        }),
      ],
    });
  });

  it("returns 500 (no fail-open) when the query fails", async () => {
    fetchChiefApprovalAuditEventsMock.mockRejectedValue(new Error("db unreachable"));
    const req = createMockRequest({ headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: "Failed to fetch approval audit events",
      message: "db unreachable",
    });
  });
});
