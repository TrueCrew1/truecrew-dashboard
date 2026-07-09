import type { VercelRequest, VercelResponse } from "@vercel/node";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { isSupabaseConfiguredMock, createMaintenanceNoteMock } = vi.hoisted(() => ({
  isSupabaseConfiguredMock: vi.fn(),
  createMaintenanceNoteMock: vi.fn(),
}));

vi.mock("../../lib/supabase/admin", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

vi.mock("../../lib/maintenance/create", () => ({
  createMaintenanceNote: createMaintenanceNoteMock,
}));

import handler from "./notes.js";

interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
  setHeader(name: string, value: string): void;
}

function createMockRequest(
  overrides: Partial<VercelRequest> & { body?: unknown } = {},
): VercelRequest {
  return {
    method: "POST",
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
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
  };
  return res;
}

const SUCCESS_RESULT = {
  workItem: { id: "task-42", type: "obsidian_filing", source: "repair", status: "filed" },
  note: {
    id: "maintenance-task-42",
    workItemId: "task-42",
    artifactType: "obsidian_note",
    title: "Maintenance — Replace HVAC filter",
    targetPath: "Operations/Maintenance/2026-07-09 — Replace HVAC filter.md",
    tags: ["maintenance", "operations"],
    createdAt: "2026-07-09T00:00:00.000Z",
    summary: "Quarterly maintenance on rooftop unit 3.",
    refinementSource: "deterministic",
  },
  vaultWritten: true,
};

beforeEach(() => {
  isSupabaseConfiguredMock.mockReturnValue(true);
  createMaintenanceNoteMock.mockResolvedValue(SUCCESS_RESULT);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("/api/maintenance/notes", () => {
  it("returns 405 for a non-POST method", async () => {
    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: "Method not allowed" });
    expect(createMaintenanceNoteMock).not.toHaveBeenCalled();
  });

  it("returns 503 when Supabase is not configured", async () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    const req = createMockRequest({ body: { taskId: "task-42" } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ ok: false, error: "Database not configured" });
    expect(createMaintenanceNoteMock).not.toHaveBeenCalled();
  });

  it("returns 400 when taskId is missing", async () => {
    const req = createMockRequest({ body: {} });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ ok: false, error: "taskId is required" });
    expect(createMaintenanceNoteMock).not.toHaveBeenCalled();
  });

  it("returns 400 when taskId is whitespace-only", async () => {
    const req = createMockRequest({ body: { taskId: "   " } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(400);
    expect(createMaintenanceNoteMock).not.toHaveBeenCalled();
  });

  it("creates the maintenance note and returns 201 with the note, work item, and vaultWritten flag", async () => {
    const req = createMockRequest({ body: { taskId: "task-42", actor: "founder" } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(createMaintenanceNoteMock).toHaveBeenCalledWith({
      taskId: "task-42",
      actor: "founder",
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      ok: true,
      workItem: SUCCESS_RESULT.workItem,
      note: SUCCESS_RESULT.note,
      vaultWritten: true,
    });
  });

  it("defaults actor to 'operator' for an unrecognized or missing actor", async () => {
    const req = createMockRequest({ body: { taskId: "task-42", actor: "not-a-real-persona" } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(createMaintenanceNoteMock).toHaveBeenCalledWith({
      taskId: "task-42",
      actor: "operator",
    });
  });

  it("returns 404 when the task does not exist", async () => {
    createMaintenanceNoteMock.mockRejectedValue(new Error("Task not found"));
    const req = createMockRequest({ body: { taskId: "task-missing" } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ ok: false, error: "Task not found" });
  });

  it("returns 500 for any other failure", async () => {
    createMaintenanceNoteMock.mockRejectedValue(new Error("index unavailable"));
    const req = createMockRequest({ body: { taskId: "task-42" } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ ok: false, error: "index unavailable" });
  });
});
