import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { isSupabaseConfiguredMock, fetchPlannerWorkItemsByStatusMock, mapPlannerWorkItemToClientMock } =
  vi.hoisted(() => ({
    isSupabaseConfiguredMock: vi.fn(),
    fetchPlannerWorkItemsByStatusMock: vi.fn(),
    mapPlannerWorkItemToClientMock: vi.fn((row: { id: string }) => ({ id: row.id })),
  }));

vi.mock("../../../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

vi.mock("../../../lib/supabase/planner-work-items-queries.js", () => ({
  fetchPlannerWorkItemsByStatus: fetchPlannerWorkItemsByStatusMock,
  mapPlannerWorkItemToClient: mapPlannerWorkItemToClientMock,
}));

import handler from "./librarian.js";

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
  return { method: "GET", headers, body, query: {}, ...rest } as VercelRequest;
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

describe("/api/planner/work-items/librarian", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", INTERNAL_SECRET);
    isSupabaseConfiguredMock.mockReturnValue(true);
    fetchPlannerWorkItemsByStatusMock.mockResolvedValue([]);
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
    expect(fetchPlannerWorkItemsByStatusMock).not.toHaveBeenCalled();
  });

  it("returns 405 for a non-GET method", async () => {
    const req = createMockRequest({ method: "POST", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(405);
  });

  it("filters to new and in_progress work items", async () => {
    fetchPlannerWorkItemsByStatusMock.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    const req = createMockRequest({ headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(fetchPlannerWorkItemsByStatusMock).toHaveBeenCalledWith(["new", "in_progress"], 20);
    expect(res.body).toEqual({ workItems: [{ id: "a" }, { id: "b" }] });
  });
});
