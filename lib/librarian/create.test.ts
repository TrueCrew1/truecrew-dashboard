import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../supabase/admin", () => ({
  isSupabaseConfigured: vi.fn(),
  writeAuditEvent: vi.fn(),
}));
vi.mock("../supabase/notes", () => ({
  fetchNoteForTaskUuid: vi.fn(),
  fetchNotesForTaskUuid: vi.fn(),
  fetchTaskRowByClientId: vi.fn(),
  mapDbNoteToArtifact: vi.fn(),
  setTaskObsidianNoteId: vi.fn(),
  upsertNoteByPath: vi.fn(),
}));
vi.mock("../obsidian/config", () => ({
  isVaultConfigured: vi.fn(),
}));
vi.mock("../obsidian/write", () => ({
  writeVaultNote: vi.fn(),
}));
vi.mock("../mappers/tasks", () => ({
  mapDbTaskToClient: vi.fn(),
}));
vi.mock("./refine", () => ({
  refineArtifactDraft: vi.fn(),
}));

import { isSupabaseConfigured, writeAuditEvent } from "../supabase/admin";
import type { DbTaskRow } from "../supabase/admin";
import {
  fetchNoteForTaskUuid,
  fetchNotesForTaskUuid,
  fetchTaskRowByClientId,
  mapDbNoteToArtifact,
  setTaskObsidianNoteId,
  upsertNoteByPath,
} from "../supabase/notes";
import type { DbNoteRow } from "../supabase/notes";
import { isVaultConfigured } from "../obsidian/config";
import { writeVaultNote } from "../obsidian/write";
import { mapDbTaskToClient } from "../mappers/tasks";
import type { ClientTask } from "../mappers/tasks";
import { refineArtifactDraft } from "./refine";
import type { Artifact } from "../../src/types";
import { createTaskArtifact, listTaskArtifacts } from "./create";

function makeClientTask(overrides: Partial<ClientTask> = {}): ClientTask {
  return {
    id: "task-7",
    title: "Rebuild pump station telemetry",
    description: "Swap the failed telemetry board.",
    stage: "Done",
    workflowType: "repair",
    priority: "high",
    gates: [],
    linkedEntities: [],
    createdBy: "operator",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeTaskRow(overrides: Partial<DbTaskRow> = {}): DbTaskRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    legacy_id: "task-7",
    title: "Rebuild pump station telemetry",
    description: "Swap the failed telemetry board.",
    stage: "Done",
    workflow_type: "repair",
    priority: "high",
    assignee: "operator",
    due_at: null,
    blocker: null,
    github_ref: null,
    github_repo: null,
    github_issue_number: null,
    github_pr_number: null,
    github_head_sha: null,
    obsidian_note_id: null,
    created_by: "operator",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    gate_checks: [],
    ...overrides,
  };
}

function makeNoteRow(overrides: Partial<DbNoteRow> = {}): DbNoteRow {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    legacy_id: "artifact-task-7",
    title: "Rebuild pump station telemetry — work record",
    type: "incident",
    obsidian_path: "Operations/Artifacts/2026-07-01 — Rebuild pump station telemetry.md",
    summary: "Swap the failed telemetry board.",
    source_task_id: "11111111-1111-1111-1111-111111111111",
    synced_at: "2026-07-01T00:00:00.000Z",
    tags: ["repair", "done", "librarian"],
    refinement_source: "deterministic",
    agent: "librarian",
    created_by: "operator",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

const mappedArtifact: Artifact = {
  id: "artifact-task-7",
  workItemId: "task-7",
  artifactType: "obsidian_note",
  title: "Rebuild pump station telemetry — work record",
  targetPath: "Operations/Artifacts/2026-07-01 — Rebuild pump station telemetry.md",
  tags: ["repair", "done", "librarian"],
  createdAt: "2026-07-01T00:00:00.000Z",
  summary: "Swap the failed telemetry board.",
  refinementSource: "deterministic",
};

/** Shared assertion for the hard-fail governance contract: the call rejects. */
async function expectHardFail(promise: Promise<unknown>, message: string) {
  await expect(promise).rejects.toThrow(message);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isSupabaseConfigured).mockReturnValue(true);
  vi.mocked(isVaultConfigured).mockReturnValue(true);
  vi.mocked(fetchTaskRowByClientId).mockResolvedValue(makeTaskRow());
  vi.mocked(fetchNoteForTaskUuid).mockResolvedValue(null);
  vi.mocked(mapDbTaskToClient).mockReturnValue(makeClientTask());
  vi.mocked(refineArtifactDraft).mockResolvedValue({
    title: "Rebuild pump station telemetry — work record",
    summary: "Swap the failed telemetry board.",
    tags: ["repair", "done", "librarian"],
    pathSegment: "Rebuild pump station telemetry",
    noteType: "incident",
    refinementSource: "deterministic",
  });
  vi.mocked(upsertNoteByPath).mockResolvedValue(makeNoteRow());
  vi.mocked(setTaskObsidianNoteId).mockResolvedValue(undefined);
  vi.mocked(writeAuditEvent).mockResolvedValue(undefined);
  vi.mocked(writeVaultNote).mockResolvedValue("/vault/note.md");
  vi.mocked(mapDbNoteToArtifact).mockReturnValue(mappedArtifact);
});

describe("createTaskArtifact", () => {
  it("hard-fails when Supabase is not configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    await expectHardFail(createTaskArtifact({ taskId: "task-7" }), "Database not configured");
    expect(fetchTaskRowByClientId).not.toHaveBeenCalled();
  });

  it("hard-fails when the task does not exist", async () => {
    vi.mocked(fetchTaskRowByClientId).mockResolvedValue(null);
    await expectHardFail(createTaskArtifact({ taskId: "nope" }), "Task not found");
    expect(upsertNoteByPath).not.toHaveBeenCalled();
  });

  it("hard-fails with ARTIFACT_EXISTS when an artifact already exists for the task", async () => {
    vi.mocked(fetchNoteForTaskUuid).mockResolvedValue(makeNoteRow());

    const promise = createTaskArtifact({ taskId: "task-7" });
    await expectHardFail(promise, "Artifact already exists for this task");
    await promise.catch((err: Error & { code?: string }) => {
      expect(err.code).toBe("ARTIFACT_EXISTS");
    });
    expect(upsertNoteByPath).not.toHaveBeenCalled();
  });

  it("success path: writes the vault note, upserts, links the task, audits and returns the artifact", async () => {
    const result = await createTaskArtifact({ taskId: "task-7" });

    expect(writeVaultNote).toHaveBeenCalledTimes(1);
    expect(upsertNoteByPath).toHaveBeenCalledTimes(1);
    expect(setTaskObsidianNoteId).toHaveBeenCalledTimes(1);
    expect(writeAuditEvent).toHaveBeenCalledWith(
      "task",
      "11111111-1111-1111-1111-111111111111",
      "artifact_created",
      expect.objectContaining({ vaultWritten: true }),
      "librarian",
    );
    expect(result.vaultWritten).toBe(true);
    expect(result.artifact).toEqual(mappedArtifact);
    expect(result.workItem.status).toBe("filed");
  });

  it("labels DB and vault consistently: persisted type matches the vault frontmatter type", async () => {
    await createTaskArtifact({ taskId: "task-7" });

    expect(vi.mocked(upsertNoteByPath).mock.calls[0][0]).toMatchObject({ type: "incident" });
    const [, markdown] = vi.mocked(writeVaultNote).mock.calls[0];
    expect(markdown).toContain("type: incident");
    expect(markdown).toContain("agent: librarian");
  });

  it("fail-open: skips the vault write when the vault is not configured but still persists", async () => {
    vi.mocked(isVaultConfigured).mockReturnValue(false);

    const result = await createTaskArtifact({ taskId: "task-7" });

    expect(writeVaultNote).not.toHaveBeenCalled();
    expect(upsertNoteByPath).toHaveBeenCalledTimes(1);
    expect(setTaskObsidianNoteId).toHaveBeenCalledTimes(1);
    expect(result.vaultWritten).toBe(false);
  });

  it("hard-fails when the Supabase index write rejects, before linking or auditing", async () => {
    vi.mocked(upsertNoteByPath).mockRejectedValue(new Error("index unavailable"));

    await expectHardFail(createTaskArtifact({ taskId: "task-7" }), "index unavailable");

    expect(setTaskObsidianNoteId).not.toHaveBeenCalled();
    expect(writeAuditEvent).not.toHaveBeenCalled();
  });

  it("hard-fails when the audit event write rejects, even though the note was already created and linked (governance: audit failure is not fail-open here)", async () => {
    vi.mocked(writeAuditEvent).mockRejectedValue(new Error("audit sink unreachable"));

    await expectHardFail(createTaskArtifact({ taskId: "task-7" }), "audit sink unreachable");

    expect(upsertNoteByPath).toHaveBeenCalledTimes(1);
    expect(setTaskObsidianNoteId).toHaveBeenCalledTimes(1);
  });
});

describe("listTaskArtifacts", () => {
  it("hard-fails when Supabase is not configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    await expectHardFail(listTaskArtifacts("task-7"), "Database not configured");
  });

  it("hard-fails when the task does not exist", async () => {
    vi.mocked(fetchTaskRowByClientId).mockResolvedValue(null);
    await expectHardFail(listTaskArtifacts("nope"), "Task not found");
  });

  it("maps each stored note row to an artifact", async () => {
    vi.mocked(fetchNotesForTaskUuid).mockResolvedValue([makeNoteRow(), makeNoteRow()]);

    const artifacts = await listTaskArtifacts("task-7");

    expect(fetchNotesForTaskUuid).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111");
    expect(mapDbNoteToArtifact).toHaveBeenCalledTimes(2);
    expect(artifacts).toEqual([mappedArtifact, mappedArtifact]);
  });
});
