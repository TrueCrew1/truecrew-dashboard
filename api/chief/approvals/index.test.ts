import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  isSupabaseConfiguredMock,
  writeAuditEventMock,
  fetchChiefApprovalDecisionsMock,
  insertChiefApprovalDecisionMock,
} = vi.hoisted(() => ({
  isSupabaseConfiguredMock: vi.fn(),
  writeAuditEventMock: vi.fn(),
  fetchChiefApprovalDecisionsMock: vi.fn(),
  insertChiefApprovalDecisionMock: vi.fn(),
}));

vi.mock("../../../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
  writeAuditEvent: writeAuditEventMock,
}));

vi.mock("../../../lib/supabase/queries.js", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/supabase/queries.js")>(
    "../../../lib/supabase/queries.js",
  );
  return {
    ...actual,
    fetchChiefApprovalDecisions: fetchChiefApprovalDecisionsMock,
    insertChiefApprovalDecision: insertChiefApprovalDecisionMock,
  };
});

import handler from "./index.js";

const INTERNAL_SECRET = "test-internal-secret";

interface MockResponse {
  statusCode: number;
  body: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function createMockRequest(
  overrides: Partial<VercelRequest> & { headers?: Record<string, string>; body?: unknown } = {},
): VercelRequest {
  const { headers = {}, body, ...rest } = overrides;
  return {
    method: "POST",
    headers,
    body,
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

function decisionRow() {
  return {
    proposal_id: "apr-1",
    status: "approved" as const,
    decided_at: "2026-07-08T00:00:00.000Z",
    actor: "operator" as const,
  };
}

describe("/api/chief/approvals", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", INTERNAL_SECRET);
    isSupabaseConfiguredMock.mockReturnValue(true);
    fetchChiefApprovalDecisionsMock.mockResolvedValue([]);
    insertChiefApprovalDecisionMock.mockResolvedValue({ row: decisionRow(), created: true });
    writeAuditEventMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns 401 without internal auth", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: {},
      body: { proposalId: "apr-1", status: "approved" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(401);
    expect(writeAuditEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid status value", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { proposalId: "apr-1", status: "bogus" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(400);
    expect(insertChiefApprovalDecisionMock).not.toHaveBeenCalled();
    expect(writeAuditEventMock).not.toHaveBeenCalled();
  });

  it("POST records a decision and emits a durable audit event", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { proposalId: "apr-1", status: "approved", actor: "operator" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(201);
    expect(writeAuditEventMock).toHaveBeenCalledWith(
      "chief_approval_decision",
      "apr-1",
      "chief.approval.approved",
      { status: "approved", decidedAt: "2026-07-08T00:00:00.000Z" },
      "operator",
    );
  });

  it("passes a non-UUID proposal id straight through as entity_id (regression: audit_events.entity_id is text, not uuid — see 20260710000001_audit_events_entity_id_text.sql)", async () => {
    const nonUuidProposalId = "apr-pr-63";
    insertChiefApprovalDecisionMock.mockResolvedValue({
      row: { ...decisionRow(), proposal_id: nonUuidProposalId },
      created: true,
    });
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { proposalId: nonUuidProposalId, status: "approved" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(201);
    expect(writeAuditEventMock).toHaveBeenCalledWith(
      "chief_approval_decision",
      nonUuidProposalId,
      "chief.approval.approved",
      expect.any(Object),
      "operator",
    );
  });

  it("uses each decision's own status in the audit event action (rejected)", async () => {
    insertChiefApprovalDecisionMock.mockResolvedValue({
      row: { ...decisionRow(), status: "rejected", actor: null },
      created: true,
    });
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { proposalId: "apr-1", status: "rejected" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(writeAuditEventMock).toHaveBeenCalledWith(
      "chief_approval_decision",
      "apr-1",
      "chief.approval.rejected",
      expect.objectContaining({ status: "rejected" }),
      "operator",
    );
  });

  it("falls back to actor 'operator' in the audit event when no actor was supplied", async () => {
    insertChiefApprovalDecisionMock.mockResolvedValue({
      row: { ...decisionRow(), actor: null },
      created: true,
    });
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { proposalId: "apr-1", status: "approved" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(writeAuditEventMock).toHaveBeenCalledWith(
      "chief_approval_decision",
      "apr-1",
      "chief.approval.approved",
      expect.any(Object),
      "operator",
    );
  });

  it("does not emit an audit event for an already-decided (duplicate) proposal", async () => {
    insertChiefApprovalDecisionMock.mockResolvedValue({ row: decisionRow(), created: false });
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { proposalId: "apr-1", status: "approved" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(409);
    expect(writeAuditEventMock).not.toHaveBeenCalled();
  });

  it("still records the decision when the audit event write fails (fail open per ADR-001)", async () => {
    writeAuditEventMock.mockRejectedValue(new Error("audit_events insert failed"));
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { proposalId: "apr-1", status: "approved" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ decision: mapDecision(decisionRow()) });
  });

  it("GET fetches decisions and does not touch audit events", async () => {
    fetchChiefApprovalDecisionsMock.mockResolvedValue([decisionRow()]);
    const req = createMockRequest({ method: "GET", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(writeAuditEventMock).not.toHaveBeenCalled();
  });
});

function mapDecision(row: ReturnType<typeof decisionRow>) {
  return {
    proposalId: row.proposal_id,
    status: row.status,
    decidedAt: row.decided_at,
    actor: row.actor,
  };
}
