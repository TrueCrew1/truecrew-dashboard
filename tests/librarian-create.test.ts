import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbTaskRow } from "../lib/supabase/admin.js";
import type { DbNoteRow, UpsertNoteInput } from "../lib/supabase/notes.js";

const {
  isSupabaseConfiguredMock,
  writeAuditEventMock,
  fetchTaskRowByClientIdMock,
  fetchNoteForTaskUuidMock,
  fetchNotesForTaskUuidMock,
  upsertNoteByPathMock,
  setTaskObsidianNoteIdMock,
  isVaultConfiguredMock,
  writeVaultNoteMock,
} = vi.hoisted(() => ({
  isSupabaseConfiguredMock: vi.fn(),
  writeAuditEventMock: vi.fn(),
  fetchTaskRowByClientIdMock: vi.fn(),
  fetchNoteForTaskUuidMock: vi.fn(),
  fetchNotesForTaskUuidMock: vi.fn(),
  upsertNoteByPathMock: vi.fn(),
  setTaskObsidianNoteIdMock: vi.fn(),
  isVaultConfiguredMock: vi.fn(),
  writeVaultNoteMock: vi.fn(),
}));

vi.mock("../lib/supabase/admin.js", () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
  writeAuditEvent: writeAuditEventMock,
}));

// Keep mapDbNoteToArtifact real so success-path assertions exercise real
// field-mapping/linkage behavior; only the DB-hitting functions are stubbed.
vi.mock("../lib/supabase/notes.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/supabase/notes.js")>();
  return {
    ...actual,
    fetchTaskRowByClientId: fetchTaskRowByClientIdMock,
    fetchNoteForTaskUuid: fetchNoteForTaskUuidMock,
    fetchNotesForTaskUuid: fetchNotesForTaskUuidMock,
    upsertNoteByPath: upsertNoteByPathMock,
    setTaskObsidianNoteId: setTaskObsidianNoteIdMock,
  };
});

vi.mock("../lib/obsidian/config.js", () => ({
  isVaultConfigured: isVaultConfiguredMock,
}));

vi.mock("../lib/obsidian/write.js", () => ({
  writeVaultNote: writeVaultNoteMock,
}));

import { createTaskArtifact, listTaskArtifacts } from "../lib/librarian/create.js";

const taskRow: DbTaskRow = {
  id: "11111111-1111-1111-1111-111111111111",
  legacy_id: "task-1",
  title: "Rebuild pump seal",
  description: "Seal failed; needs replacement",
  stage: "Done",
  workflow_type: "repair",
  priority: "high",
  assignee: null,
  due_at: null,
  blocker: null,
  github_ref: null,
  github_repo: null,
  github_issue_number: null,
  github_pr_number: null,
  github_head_sha: null,
  obsidian_note_id: null,
  created_by: "operator",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  gate_checks: [],
};

const existingNoteRow: DbNoteRow = {
  id: "note-uuid-0",
  legacy_id: "artifact-task-1",
  title: "Existing note",
  type: "incident",
  obsidian_path: "Operations/Artifacts/2025-12-01 — Existing note.md",
  summary: "Already filed",
  source_task_id: taskRow.id,
  synced_at: "2025-12-01T00:00:00.000Z",
  tags: ["repair", "librarian"],
  refinement_source: "deterministic",
  agent: "librarian",
  created_by: "operator",
  created_at: "2025-12-01T00:00:00.000Z",
  updated_at: "2025-12-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  isSupabaseConfiguredMock.mockReturnValue(true);
  isVaultConfiguredMock.mockReturnValue(false);
  fetchTaskRowByClientIdMock.mockResolvedValue(taskRow);
  fetchNoteForTaskUuidMock.mockResolvedValue(null);
  fetchNotesForTaskUuidMock.mockResolvedValue([]);
  writeAuditEventMock.mockResolvedValue(undefined);
  setTaskObsidianNoteIdMock.mockResolvedValue(undefined);
  writeVaultNoteMock.mockResolvedValue("/vault/note.md");
  upsertNoteByPathMock.mockImplementation(async (input: UpsertNoteInput): Promise<DbNoteRow> => ({
    id: "note-uuid-1",
    legacy_id: input.legacyId,
    title: input.title,
    type: input.type,
    obsidian_path: input.obsidianPath,
    summary: input.summary,
    source_task_id: input.sourceTaskUuid,
    synced_at: "2026-01-02T00:00:00.000Z",
    tags: input.tags,
    refinement_source: input.refinementSource,
    agent: input.agent ?? "librarian",
    created_by: input.createdBy,
    created_at: "2026-01-02T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  }));
});

describe("listTaskArtifacts", () => {
  it("throws when the database is not configured", async () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    await expect(listTaskArtifacts("task-1")).rejects.toThrow("Database not configured");
  });
});

describe("createTaskArtifact", () => {
  it("throws when the database is not configured", async () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    await expect(createTaskArtifact({ taskId: "task-1" })).rejects.toThrow(
      "Database not configured",
    );
  });

  it("throws 'Task not found' when no matching task row exists", async () => {
    fetchTaskRowByClientIdMock.mockResolvedValue(null);
    await expect(createTaskArtifact({ taskId: "missing" })).rejects.toThrow("Task not found");
  });

  it("throws an ARTIFACT_EXISTS error when a note already exists for the task", async () => {
    fetchNoteForTaskUuidMock.mockResolvedValue(existingNoteRow);

    await expect(createTaskArtifact({ taskId: "task-1" })).rejects.toMatchObject({
      code: "ARTIFACT_EXISTS",
    });
    expect(upsertNoteByPathMock).not.toHaveBeenCalled();
  });

  it("creates and links an artifact when the vault is configured", async () => {
    isVaultConfiguredMock.mockReturnValue(true);

    const result = await createTaskArtifact({ taskId: "task-1" });

    expect(result.vaultWritten).toBe(true);
    expect(writeVaultNoteMock).toHaveBeenCalledTimes(1);

    expect(result.artifact).toMatchObject({
      workItemId: "task-1",
      artifactType: "obsidian_note",
      title: "Rebuild pump seal — work record",
      tags: ["repair", "done", "librarian", "high"],
    });
    expect(result.artifact.targetPath).toMatch(
      /^Operations\/Artifacts\/\d{4}-\d{2}-\d{2} — Rebuild pump seal\.md$/,
    );
    expect(typeof result.artifact.createdAt).toBe("string");
    expect(result.artifact.createdAt.length).toBeGreaterThan(0);

    expect(setTaskObsidianNoteIdMock).toHaveBeenCalledWith(taskRow.id, result.artifact.targetPath);
    expect(writeAuditEventMock).toHaveBeenCalledWith(
      "task",
      taskRow.id,
      "artifact_created",
      expect.objectContaining({ vaultWritten: true }),
      "librarian",
    );
  });

  it("skips the vault write and reports vaultWritten: false when the vault is not configured", async () => {
    isVaultConfiguredMock.mockReturnValue(false);

    const result = await createTaskArtifact({ taskId: "task-1" });

    expect(result.vaultWritten).toBe(false);
    expect(writeVaultNoteMock).not.toHaveBeenCalled();
  });

  it("links the created artifact back to the source work item", async () => {
    const result = await createTaskArtifact({ taskId: "task-1" });

    expect(result.workItem.id).toBe("task-1");
    expect(result.workItem.type).toBe("obsidian_filing");
    expect(result.workItem.status).toBe("filed");
    expect(result.artifact.workItemId).toBe(result.workItem.id);
  });
});
