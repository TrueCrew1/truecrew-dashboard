import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { isSupabaseConfiguredMock, insertRuntimeWorkItemMock, fetchLibrarianWorkItemsMock, getRuntimeWorkItemByIdempotencyKeyMock, mapRuntimeWorkItemToClientMock } =
  vi.hoisted(() => ({
    isSupabaseConfiguredMock: vi.fn(),
    insertRuntimeWorkItemMock: vi.fn(),
    fetchLibrarianWorkItemsMock: vi.fn(),
    getRuntimeWorkItemByIdempotencyKeyMock: vi.fn(),
    mapRuntimeWorkItemToClientMock: vi.fn((row: { id: string }) => ({
      id: row.id,
      agentRole: "librarian",
      status: "queued",
      latestObsidianPath: null,
    })),
  }));

vi.mock("../../../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

vi.mock("../../../lib/supabase/runtime-queries.js", () => ({
  insertRuntimeWorkItem: insertRuntimeWorkItemMock,
  fetchLibrarianWorkItems: fetchLibrarianWorkItemsMock,
  getRuntimeWorkItemByIdempotencyKey: getRuntimeWorkItemByIdempotencyKeyMock,
  mapRuntimeWorkItemToClient: mapRuntimeWorkItemToClientMock,
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

describe("/api/runtime/librarian/work-items", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", INTERNAL_SECRET);
    isSupabaseConfiguredMock.mockReturnValue(true);
    fetchLibrarianWorkItemsMock.mockResolvedValue([]);
    getRuntimeWorkItemByIdempotencyKeyMock.mockResolvedValue(null);
    insertRuntimeWorkItemMock.mockResolvedValue({ id: "work-1" });
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
  });

  it("GET returns librarian work items", async () => {
    fetchLibrarianWorkItemsMock.mockResolvedValue([{ id: "work-1" }]);
    const req = createMockRequest({ method: "GET", headers: authorizedHeaders() });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ workItems: [{ id: "work-1" }] });
  });

  it("POST enqueues a chief_decision work item", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: {
        inputKind: "chief_decision",
        triggerType: "reactive",
        inputPayload: {
          title: "Test decision",
          decision: "Approved. Proceed.",
          context: "Summary",
        },
        idempotencyKey: "librarian:chief_decision:apr-1",
        chiefProposalId: "apr-1",
      },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(201);
    expect(insertRuntimeWorkItemMock).toHaveBeenCalled();
  });

  it("POST returns existing item for duplicate idempotency key", async () => {
    getRuntimeWorkItemByIdempotencyKeyMock.mockResolvedValue({ id: "existing" });
    const req = createMockRequest({
      method: "POST",
      headers: authorizedHeaders(),
      body: {
        inputKind: "chief_decision",
        inputPayload: { title: "T", decision: "D" },
        idempotencyKey: "dup-key",
      },
    });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(insertRuntimeWorkItemMock).not.toHaveBeenCalled();
  });
});
