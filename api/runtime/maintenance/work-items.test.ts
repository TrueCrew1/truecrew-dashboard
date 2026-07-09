import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  isSupabaseConfiguredMock,
  insertRuntimeMaintenanceWorkItemMock,
  getRuntimeWorkItemByIdempotencyKeyMock,
} = vi.hoisted(() => ({
  isSupabaseConfiguredMock: vi.fn(),
  insertRuntimeMaintenanceWorkItemMock: vi.fn(),
  getRuntimeWorkItemByIdempotencyKeyMock: vi.fn(),
}));

vi.mock("../../../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

vi.mock("../../../lib/supabase/runtime-queries.js", () => ({
  insertRuntimeMaintenanceWorkItem: insertRuntimeMaintenanceWorkItemMock,
  getRuntimeWorkItemByIdempotencyKey: getRuntimeWorkItemByIdempotencyKeyMock,
}));

import handler from "./work-items.js";

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

function validInputPayload() {
  return {
    title: "Replace HVAC filter — Unit 4",
    description: "Filter is past its service interval, swap for a MERV-13.",
  };
}

describe("/api/runtime/maintenance/work-items", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", INTERNAL_SECRET);
    isSupabaseConfiguredMock.mockReturnValue(true);
    getRuntimeWorkItemByIdempotencyKeyMock.mockResolvedValue(null);
    insertRuntimeMaintenanceWorkItemMock.mockResolvedValue({ id: "maint-1" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns 401 without internal auth", async () => {
    const req = createMockRequest({ method: "POST", headers: {}, body: { inputPayload: validInputPayload() } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(401);
    expect(insertRuntimeMaintenanceWorkItemMock).not.toHaveBeenCalled();
  });

  it("returns 503 when Supabase is not configured", async () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { inputPayload: validInputPayload() },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: "Database not configured" });
    expect(insertRuntimeMaintenanceWorkItemMock).not.toHaveBeenCalled();
  });

  it("returns 405 for an unsupported HTTP method (this endpoint is POST-only)", async () => {
    const req = createMockRequest({ method: "GET", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: "Method not allowed" });
    expect(insertRuntimeMaintenanceWorkItemMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid inputPayload (missing title)", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { inputPayload: { description: "Swap the filter" } },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "maintenance_task payload requires title" });
    expect(insertRuntimeMaintenanceWorkItemMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a whitespace-only required field", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { inputPayload: { title: "   ", description: "Swap the filter" } },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "maintenance_task payload requires title" });
    expect(insertRuntimeMaintenanceWorkItemMock).not.toHaveBeenCalled();
  });

  it("POST enqueues a maintenance_task work item", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: {
        triggerType: "reactive",
        inputPayload: validInputPayload(),
        idempotencyKey: "maintenance:hvac-4:apr-1",
        chiefProposalId: "apr-1",
      },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ workItem: { id: "maint-1" }, created: true });
    expect(insertRuntimeMaintenanceWorkItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerType: "reactive",
        inputPayload: validInputPayload(),
        idempotencyKey: "maintenance:hvac-4:apr-1",
        chiefProposalId: "apr-1",
      }),
    );
  });

  it("POST returns existing item for duplicate idempotency key", async () => {
    getRuntimeWorkItemByIdempotencyKeyMock.mockResolvedValue({ id: "existing" });
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: {
        inputPayload: validInputPayload(),
        idempotencyKey: "dup-key",
      },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ workItem: { id: "existing" }, created: false });
    expect(insertRuntimeMaintenanceWorkItemMock).not.toHaveBeenCalled();
  });
});
