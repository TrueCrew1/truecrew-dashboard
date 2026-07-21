import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const { requireInternalAuthMock, runChiefCommandMock } = vi.hoisted(() => ({
  requireInternalAuthMock: vi.fn(),
  runChiefCommandMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  requireInternalAuth: requireInternalAuthMock,
}));

vi.mock("../lib/chief/runChiefCommand.js", () => ({
  runChiefCommand: runChiefCommandMock,
}));

import handler from "../api/chief/command.js";

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  setHeader(name: string, value: string): void;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function createMockRequest(
  overrides: Partial<VercelRequest> & { body?: unknown } = {},
): VercelRequest {
  return {
    method: "POST",
    headers: {},
    body: {},
    query: {},
    ...overrides,
  } as VercelRequest;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
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

const minimalBody = {
  prompt: "What is at risk today?",
  source: "sidebar",
  liveContext: {
    stats: { openWorkOrders: 1, overduePMs: 0 },
    focusItems: [],
    alerts: [],
    openTaskCount: 2,
    blockingTasks: [],
    overdueTasks: [],
    tasksMissingCustomer: [],
    tasksMissingWorkflow: [],
    activeIncidents: [],
    blockedDeploys: [],
    waitingCustomers: [],
  },
  knowledge: { runbooks: [], prompts: [], notes: [] },
  approvals: [],
  workflows: [],
};

describe("POST /api/chief/command", () => {
  beforeEach(() => {
    requireInternalAuthMock.mockReset();
    runChiefCommandMock.mockReset();
    requireInternalAuthMock.mockImplementation((_req: unknown, _res: unknown) => true);
  });

  it("rejects unauthenticated requests", async () => {
    requireInternalAuthMock.mockImplementation((_req: unknown, res: MockResponse) => {
      res.status(401).json({ error: "Unauthorized" });
      return false;
    });
    const res = createMockResponse();
    await handler(createMockRequest({ body: minimalBody }), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(401);
    expect(runChiefCommandMock).not.toHaveBeenCalled();
  });

  it("rejects non-POST methods", async () => {
    const res = createMockResponse();
    await handler(createMockRequest({ method: "GET", body: minimalBody }), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(405);
  });

  it("rejects missing prompt", async () => {
    const res = createMockResponse();
    await handler(
      createMockRequest({ body: { ...minimalBody, prompt: "  " } }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(400);
  });

  it("returns command result on success", async () => {
    runChiefCommandMock.mockResolvedValue({
      summary: "2 open task(s).",
      recommendedAction: "Review focus queue.",
      routedTo: "Chief",
      matched: true,
      resolution: "deterministic",
    });
    const res = createMockResponse();
    await handler(createMockRequest({ body: minimalBody }), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      summary: "2 open task(s).",
      matched: true,
      resolution: "deterministic",
      source: "sidebar",
    });
  });
});
