import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  isSupabaseConfiguredMock,
  insertRuntimePlannerWorkItemMock,
  getRuntimeWorkItemByIdempotencyKeyMock,
  fetchPlannerWorkItemsMock,
  mapRuntimePlannerWorkItemToClientMock,
} = vi.hoisted(() => ({
  isSupabaseConfiguredMock: vi.fn(),
  insertRuntimePlannerWorkItemMock: vi.fn(),
  getRuntimeWorkItemByIdempotencyKeyMock: vi.fn(),
  fetchPlannerWorkItemsMock: vi.fn(),
  mapRuntimePlannerWorkItemToClientMock: vi.fn((row: { id: string }) => ({
    id: row.id,
    agentRole: "planner",
    status: "queued",
    latestObsidianPath: null,
  })),
}));

vi.mock("../../../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

vi.mock("../../../lib/supabase/runtime-queries.js", () => ({
  insertRuntimePlannerWorkItem: insertRuntimePlannerWorkItemMock,
  getRuntimeWorkItemByIdempotencyKey: getRuntimeWorkItemByIdempotencyKeyMock,
  fetchPlannerWorkItems: fetchPlannerWorkItemsMock,
  mapRuntimePlannerWorkItemToClient: mapRuntimePlannerWorkItemToClientMock,
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
    title: "Start Phase 4 — Alerts & Escalation",
    description: "Kick off urgency buckets and inline tags on pending approvals.",
  };
}

describe("/api/runtime/planner/work-items", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", INTERNAL_SECRET);
    isSupabaseConfiguredMock.mockReturnValue(true);
    getRuntimeWorkItemByIdempotencyKeyMock.mockResolvedValue(null);
    insertRuntimePlannerWorkItemMock.mockResolvedValue({ id: "plan-1" });
    fetchPlannerWorkItemsMock.mockResolvedValue([]);
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
    expect(insertRuntimePlannerWorkItemMock).not.toHaveBeenCalled();
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
    expect(insertRuntimePlannerWorkItemMock).not.toHaveBeenCalled();
  });

  it("returns 405 for an unsupported HTTP method", async () => {
    const req = createMockRequest({ method: "DELETE", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: "Method not allowed" });
    expect(insertRuntimePlannerWorkItemMock).not.toHaveBeenCalled();
  });

  it("GET returns planner work items", async () => {
    fetchPlannerWorkItemsMock.mockResolvedValue([{ id: "plan-1" }]);
    const req = createMockRequest({ method: "GET", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ workItems: [{ id: "plan-1" }] });
    expect(fetchPlannerWorkItemsMock).toHaveBeenCalledWith(20);
  });

  it("GET clamps a custom limit and passes it through", async () => {
    const req = createMockRequest({
      method: "GET",
      headers: authorizedHeaders(),
      query: { limit: "5" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(fetchPlannerWorkItemsMock).toHaveBeenCalledWith(5);
  });

  it("returns 401 for GET without internal auth", async () => {
    const req = createMockRequest({ method: "GET", headers: {} });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(401);
    expect(fetchPlannerWorkItemsMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid inputPayload (missing title)", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { inputPayload: { description: "Kick off Phase 4" } },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "planning_task payload requires title" });
    expect(insertRuntimePlannerWorkItemMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a whitespace-only required field", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { inputPayload: { title: "   ", description: "Kick off Phase 4" } },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "planning_task payload requires title" });
    expect(insertRuntimePlannerWorkItemMock).not.toHaveBeenCalled();
  });

  it("POST enqueues a planning_task work item", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: {
        triggerType: "reactive",
        inputPayload: validInputPayload(),
        idempotencyKey: "planner:phase4:apr-planner-example-phase4",
        chiefProposalId: "apr-planner-example-phase4",
      },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      workItem: { id: "plan-1", agentRole: "planner", status: "queued", latestObsidianPath: null },
      created: true,
    });
    expect(mapRuntimePlannerWorkItemToClientMock).toHaveBeenCalledWith({ id: "plan-1" });
    expect(insertRuntimePlannerWorkItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerType: "reactive",
        inputPayload: validInputPayload(),
        idempotencyKey: "planner:phase4:apr-planner-example-phase4",
        chiefProposalId: "apr-planner-example-phase4",
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
    expect(res.body).toEqual({
      workItem: { id: "existing", agentRole: "planner", status: "queued", latestObsidianPath: null },
      created: false,
    });
    expect(mapRuntimePlannerWorkItemToClientMock).toHaveBeenCalledWith({ id: "existing" });
    expect(insertRuntimePlannerWorkItemMock).not.toHaveBeenCalled();
  });
});
