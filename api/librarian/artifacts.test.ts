import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { isSupabaseConfiguredMock, createTaskArtifactMock } = vi.hoisted(() => ({
  isSupabaseConfiguredMock: vi.fn(),
  createTaskArtifactMock: vi.fn(),
}));

vi.mock("../../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

vi.mock("../../lib/librarian/create.js", () => ({
  createTaskArtifact: createTaskArtifactMock,
}));

import handler from "./artifacts.js";

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

const workItem = { id: "task-1", type: "obsidian_filing", source: "repair", status: "filed" };
const artifact = {
  id: "artifact-1",
  workItemId: "task-1",
  artifactType: "obsidian_note",
  title: "Rebuild pump seal — work record",
  targetPath: "Operations/Artifacts/2026-01-02 — Rebuild pump seal.md",
  tags: ["repair", "librarian"],
  createdAt: "2026-01-02T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  isSupabaseConfiguredMock.mockReturnValue(true);
  createTaskArtifactMock.mockResolvedValue({ workItem, artifact, vaultWritten: true });
});

describe("POST /api/librarian/artifacts", () => {
  it("rejects non-POST methods with 405", async () => {
    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe("POST");
  });

  it("returns 503 when the database is not configured", async () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    const req = createMockRequest({ body: { taskId: "task-1" } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ ok: false, error: "Database not configured" });
    expect(createTaskArtifactMock).not.toHaveBeenCalled();
  });

  it("returns 400 when taskId is missing or blank", async () => {
    const req = createMockRequest({ body: { taskId: "   " } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(400);
    expect(createTaskArtifactMock).not.toHaveBeenCalled();
  });

  it("returns 201 with the created artifact on success", async () => {
    const req = createMockRequest({ body: { taskId: "task-1" } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ ok: true, workItem, artifact, vaultWritten: true });
    expect(createTaskArtifactMock).toHaveBeenCalledWith({
      taskId: "task-1",
      useAi: false,
      actor: "operator",
    });
  });

  it("returns 409 when an artifact already exists for the task", async () => {
    const err = Object.assign(new Error("Artifact already exists for this task"), {
      code: "ARTIFACT_EXISTS",
    });
    createTaskArtifactMock.mockRejectedValue(err);
    const req = createMockRequest({ body: { taskId: "task-1" } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ ok: false, error: "Artifact already exists for this task" });
  });

  it("returns 404 when the task is not found", async () => {
    createTaskArtifactMock.mockRejectedValue(new Error("Task not found"));
    const req = createMockRequest({ body: { taskId: "missing" } });
    const res = createMockResponse();

    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ ok: false, error: "Task not found" });
  });
});
