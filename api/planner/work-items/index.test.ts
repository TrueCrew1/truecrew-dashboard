import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  isSupabaseConfiguredMock,
  insertPlannerWorkItemMock,
  fetchPlannerWorkItemsMock,
  mapPlannerWorkItemToClientMock,
} = vi.hoisted(() => ({
  isSupabaseConfiguredMock: vi.fn(),
  insertPlannerWorkItemMock: vi.fn(),
  fetchPlannerWorkItemsMock: vi.fn(),
  mapPlannerWorkItemToClientMock: vi.fn((row: { id: string }) => ({
    id: row.id,
    title: "mapped",
    status: "new",
  })),
}));

vi.mock("../../../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

vi.mock("../../../lib/supabase/planner-work-items-queries.js", () => ({
  insertPlannerWorkItem: insertPlannerWorkItemMock,
  fetchPlannerWorkItems: fetchPlannerWorkItemsMock,
  mapPlannerWorkItemToClient: mapPlannerWorkItemToClientMock,
}));

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
    method: "GET",
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

describe("/api/planner/work-items", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", INTERNAL_SECRET);
    isSupabaseConfiguredMock.mockReturnValue(true);
    fetchPlannerWorkItemsMock.mockResolvedValue([]);
    insertPlannerWorkItemMock.mockResolvedValue({ id: "item-1" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns 401 without internal auth", async () => {
    const req = createMockRequest({ method: "GET", headers: {} });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(401);
    expect(fetchPlannerWorkItemsMock).not.toHaveBeenCalled();
  });

  it("returns 503 when Supabase is not configured", async () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    const req = createMockRequest({ method: "GET", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: "Database not configured" });
  });

  it("returns 405 for an unsupported HTTP method", async () => {
    const req = createMockRequest({ method: "DELETE", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: "Method not allowed" });
  });

  it("GET returns work items with a default limit of 20", async () => {
    fetchPlannerWorkItemsMock.mockResolvedValue([{ id: "item-1" }]);
    const req = createMockRequest({ method: "GET", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ workItems: [{ id: "item-1", title: "mapped", status: "new" }] });
    expect(fetchPlannerWorkItemsMock).toHaveBeenCalledWith(20);
  });

  it("GET clamps a custom limit", async () => {
    const req = createMockRequest({
      method: "GET",
      headers: authorizedHeaders(),
      query: { limit: "500" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(fetchPlannerWorkItemsMock).toHaveBeenCalledWith(50);
  });

  it("POST creates a work item and returns 201", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { title: "Ship the thing", priority: "high" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ workItem: { id: "item-1", title: "mapped", status: "new" } });
    expect(insertPlannerWorkItemMock).toHaveBeenCalledWith({ title: "Ship the thing", priority: "high" });
  });

  it("POST returns 400 for a missing title", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { description: "no title here" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "title is required" });
    expect(insertPlannerWorkItemMock).not.toHaveBeenCalled();
  });

  it("POST returns 400 for an invalid status enum", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: { title: "x", status: "archived" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "status must be one of: new, in_progress, blocked, done",
    });
    expect(insertPlannerWorkItemMock).not.toHaveBeenCalled();
  });
});
