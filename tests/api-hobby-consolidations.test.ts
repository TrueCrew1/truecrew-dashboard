import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireInternalAuthMock,
  isSupabaseConfiguredMock,
  fetchRawCommandCenterRowsMock,
  mapCommandCenterDataMock,
} = vi.hoisted(() => ({
  requireInternalAuthMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
  fetchRawCommandCenterRowsMock: vi.fn(),
  mapCommandCenterDataMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  requireInternalAuth: requireInternalAuthMock,
}));

vi.mock("../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("../lib/supabase/queries.js", () => ({
  fetchRawCommandCenterRows: fetchRawCommandCenterRowsMock,
}));

vi.mock("../lib/mappers/index.js", () => ({
  mapCommandCenterData: mapCommandCenterDataMock,
}));

import dataHandler from "../api/data/index.js";
import monitorHandler from "../api/monitor/index.js";

interface MockResponse {
  statusCode: number;
  body: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function createMockRequest(
  overrides: Partial<VercelRequest> = {},
): VercelRequest {
  return {
    method: "GET",
    headers: {},
    body: undefined,
    query: {},
    ...overrides,
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

beforeEach(() => {
  requireInternalAuthMock.mockReturnValue(true);
  isSupabaseConfiguredMock.mockReturnValue(true);
  fetchRawCommandCenterRowsMock.mockResolvedValue({});
  mapCommandCenterDataMock.mockReturnValue({
    tasks: [{ id: "t1" }],
    incidents: [{ id: "i1" }],
  });
});

describe("Hobby consolidations: /api/data?view=tasks", () => {
  it("returns the legacy tasks subset when view=tasks", async () => {
    const res = createMockResponse();
    await dataHandler(
      createMockRequest({ query: { view: "tasks" } }),
      res as unknown as VercelResponse,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ tasks: [{ id: "t1" }], source: "supabase" });
  });

  it("returns the full payload when view is omitted", async () => {
    const res = createMockResponse();
    await dataHandler(createMockRequest(), res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      tasks: [{ id: "t1" }],
      incidents: [{ id: "i1" }],
      source: "supabase",
    });
  });
});

describe("Hobby consolidations: /api/monitor?target=health", () => {
  it("returns the legacy health probe when target=health", async () => {
    const res = createMockResponse();
    await monitorHandler(
      createMockRequest({ query: { target: "health" } }),
      res as unknown as VercelResponse,
    );

    expect(res.statusCode).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.host).toBe("vercel");
    expect(body.supabase).toBe(true);
    expect(typeof body.timestamp).toBe("string");
  });
});
