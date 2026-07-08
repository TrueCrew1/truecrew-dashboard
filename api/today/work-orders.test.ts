import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { isSupabaseConfiguredMock, buildRealTodayWorkOrdersResponseMock } = vi.hoisted(() => ({
  isSupabaseConfiguredMock: vi.fn(),
  buildRealTodayWorkOrdersResponseMock: vi.fn(),
}));

vi.mock("../../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

vi.mock("../../lib/today/realResponse.js", () => ({
  buildRealTodayWorkOrdersResponse: buildRealTodayWorkOrdersResponseMock,
}));

import handler from "./work-orders.js";

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

describe("GET /api/today/work-orders", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", INTERNAL_SECRET);
    isSupabaseConfiguredMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    isSupabaseConfiguredMock.mockReset();
    buildRealTodayWorkOrdersResponseMock.mockReset();
  });

  it("returns 401 when internal auth is missing", async () => {
    const req = createMockRequest({ method: "GET", headers: {} });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when internal auth key is invalid", async () => {
    const req = createMockRequest({
      method: "GET",
      headers: { "x-internal-key": "wrong-secret" },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when org env context is not configured", async () => {
    vi.stubEnv("TODAY_ORG_ID", "");
    vi.stubEnv("TODAY_ORG_NAME", "");

    const req = createMockRequest({ method: "GET", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: "No org context configured",
      message: "Organization context is not configured for this deployment.",
    });
  });

  it("returns 200 with an empty Today response envelope when org env is configured", async () => {
    vi.stubEnv("TODAY_ORG_ID", "org-test-001");
    vi.stubEnv("TODAY_ORG_NAME", "Test Field Services");
    vi.stubEnv("TODAY_MEMBERSHIP_ROLE", "Supervisor");

    const req = createMockRequest({ method: "GET", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);

    const body = res.body as Record<string, unknown>;
    expect(body.org_context).toEqual({
      org_id: "org-test-001",
      org_name: "Test Field Services",
      membership_role: "Supervisor",
      membership_status: "active",
    });
    expect(body.kpi_summary).toMatchObject({
      open_count: 0,
      overdue_count: 0,
      due_today_count: 0,
      in_progress_count: 0,
      crews_on_shift_count: 0,
      waiting_approval_count: 0,
      completed_today_count: 0,
    });
    expect(body.status_priority_summary).toEqual([]);
    expect(body.needs_attention_items).toEqual([]);
    expect(body.work_order_rows).toEqual([]);
    expect(body.meta).toMatchObject({
      schema_version: "1",
      empty: true,
    });
    expect(typeof (body.meta as { as_of: string }).as_of).toBe("string");
  });

  it("returns 405 for non-GET methods", async () => {
    vi.stubEnv("TODAY_ORG_ID", "org-test-001");
    vi.stubEnv("TODAY_ORG_NAME", "Test Field Services");

    const req = createMockRequest({ method: "POST", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: "Method not allowed" });
  });

  it("returns 200 with the real response when Supabase is configured", async () => {
    vi.stubEnv("TODAY_ORG_ID", "org-test-001");
    vi.stubEnv("TODAY_ORG_NAME", "Test Field Services");
    isSupabaseConfiguredMock.mockReturnValue(true);

    const realResponse = {
      org_context: {
        org_id: "org-test-001",
        org_name: "Test Field Services",
        membership_role: "Supervisor",
        membership_status: "active",
      },
      kpi_summary: {
        open_count: 1,
        overdue_count: 0,
        due_today_count: 0,
        in_progress_count: 1,
        crews_on_shift_count: 0,
        waiting_approval_count: 0,
        completed_today_count: 0,
        as_of: "2026-07-07T00:00:00.000Z",
      },
      status_priority_summary: [],
      needs_attention_items: [],
      work_order_rows: [{ id: "task-1", title: "Pump seal replacement", status: "in_progress" }],
      meta: { as_of: "2026-07-07T00:00:00.000Z", schema_version: "1", empty: false },
    };
    buildRealTodayWorkOrdersResponseMock.mockResolvedValue(realResponse);

    const req = createMockRequest({ method: "GET", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(realResponse);
    expect(buildRealTodayWorkOrdersResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({ org_id: "org-test-001" }),
    );
  });

  it("returns 500 when building the real response fails", async () => {
    vi.stubEnv("TODAY_ORG_ID", "org-test-001");
    vi.stubEnv("TODAY_ORG_NAME", "Test Field Services");
    isSupabaseConfiguredMock.mockReturnValue(true);
    buildRealTodayWorkOrdersResponseMock.mockRejectedValue(new Error("db unreachable"));

    const req = createMockRequest({ method: "GET", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: "Failed to load work orders",
      message: "db unreachable",
    });
  });
});
