import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../supabase/admin", () => ({
  isSupabaseConfigured: vi.fn(),
  writeAuditEvent: vi.fn(),
}));
vi.mock("../supabase/notes", () => ({
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

import { isSupabaseConfigured, writeAuditEvent } from "../supabase/admin";
import type { DbTaskRow } from "../supabase/admin";
import {
  fetchTaskRowByClientId,
  mapDbNoteToArtifact,
  setTaskObsidianNoteId,
  upsertNoteByPath,
} from "../supabase/notes";
import type { DbNoteRow } from "../supabase/notes";
import { isVaultConfigured } from "../obsidian/config";
import { writeVaultNote } from "../obsidian/write";
import type { Artifact } from "../../src/types";
import { createMaintenanceNote } from "./create";

function makeTaskRow(overrides: Partial<DbTaskRow> = {}): DbTaskRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    legacy_id: "task-42",
    title: "Replace HVAC filter",
    description: "Quarterly maintenance on rooftop unit 3.",
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

function makeNoteRow(): DbNoteRow {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    legacy_id: "maintenance-task-42",
    title: "Maintenance — Replace HVAC filter",
    type: "ticket",
    obsidian_path: "Operations/Maintenance/2026-07-01 — Replace HVAC filter.md",
    summary: "Quarterly maintenance on rooftop unit 3.",
    source_task_id: "11111111-1111-1111-1111-111111111111",
    synced_at: "2026-07-01T00:00:00.000Z",
    tags: ["maintenance", "operations"],
    refinement_source: "deterministic",
    agent: "maintenance",
    created_by: "operator",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
  };
}

const mappedArtifact: Artifact = {
  id: "maintenance-task-42",
  workItemId: "task-42",
  artifactType: "obsidian_note",
  title: "Maintenance — Replace HVAC filter",
  targetPath: "Operations/Maintenance/2026-07-01 — Replace HVAC filter.md",
  tags: ["maintenance", "operations"],
  createdAt: "2026-07-01T00:00:00.000Z",
  summary: "Quarterly maintenance on rooftop unit 3.",
  refinementSource: "deterministic",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isSupabaseConfigured).mockReturnValue(true);
  vi.mocked(isVaultConfigured).mockReturnValue(true);
  vi.mocked(fetchTaskRowByClientId).mockResolvedValue(makeTaskRow());
  vi.mocked(upsertNoteByPath).mockResolvedValue(makeNoteRow());
  vi.mocked(setTaskObsidianNoteId).mockResolvedValue(undefined);
  vi.mocked(writeAuditEvent).mockResolvedValue(undefined);
  vi.mocked(writeVaultNote).mockResolvedValue("/vault/note.md");
  vi.mocked(mapDbNoteToArtifact).mockReturnValue(mappedArtifact);
});

describe("createMaintenanceNote", () => {
  it("hard-fails when Supabase is not configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);

    await expect(
      createMaintenanceNote({ taskId: "task-42" }),
    ).rejects.toThrow("Database not configured");

    expect(fetchTaskRowByClientId).not.toHaveBeenCalled();
    expect(upsertNoteByPath).not.toHaveBeenCalled();
  });

  it("hard-fails when the task does not exist", async () => {
    vi.mocked(fetchTaskRowByClientId).mockResolvedValue(null);

    await expect(
      createMaintenanceNote({ taskId: "task-missing" }),
    ).rejects.toThrow("Task not found");

    expect(upsertNoteByPath).not.toHaveBeenCalled();
    expect(writeVaultNote).not.toHaveBeenCalled();
  });

  it("happy path with vault configured writes vault + Supabase and returns the note", async () => {
    const result = await createMaintenanceNote({ taskId: "task-42" });

    expect(writeVaultNote).toHaveBeenCalledTimes(1);
    const [vaultPath, markdown] = vi.mocked(writeVaultNote).mock.calls[0];
    expect(vaultPath).toMatch(
      /^Operations\/Maintenance\/\d{4}-\d{2}-\d{2} — Replace HVAC filter\.md$/,
    );
    expect(markdown).toContain("# Maintenance — Replace HVAC filter");

    expect(upsertNoteByPath).toHaveBeenCalledTimes(1);
    expect(vi.mocked(upsertNoteByPath).mock.calls[0][0]).toMatchObject({
      legacyId: "maintenance-task-42",
      type: "ticket",
      agent: "maintenance",
      createdBy: "operator",
    });

    expect(setTaskObsidianNoteId).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      expect.stringMatching(
        /^Operations\/Maintenance\/\d{4}-\d{2}-\d{2} — Replace HVAC filter\.md$/,
      ),
    );

    expect(writeAuditEvent).toHaveBeenCalledWith(
      "task",
      "11111111-1111-1111-1111-111111111111",
      "maintenance_note_created",
      { targetPath: expect.any(String), vaultWritten: true },
      "operator",
    );

    expect(result.vaultWritten).toBe(true);
    expect(result.note).toEqual(mappedArtifact);
    expect(result.workItem).toEqual({
      id: "task-42",
      type: "obsidian_filing",
      source: "repair",
      status: "filed",
    });
  });

  it("fail-open: skips the vault write when the vault is not configured but still persists to Supabase", async () => {
    vi.mocked(isVaultConfigured).mockReturnValue(false);

    const result = await createMaintenanceNote({ taskId: "task-42" });

    expect(writeVaultNote).not.toHaveBeenCalled();
    expect(upsertNoteByPath).toHaveBeenCalledTimes(1);
    expect(setTaskObsidianNoteId).toHaveBeenCalledTimes(1);
    expect(writeAuditEvent).toHaveBeenCalledTimes(1);
    expect(result.vaultWritten).toBe(false);
  });

  it("hard-fails when the Supabase index write rejects", async () => {
    vi.mocked(upsertNoteByPath).mockRejectedValue(new Error("index unavailable"));

    await expect(
      createMaintenanceNote({ taskId: "task-42" }),
    ).rejects.toThrow("index unavailable");

    expect(setTaskObsidianNoteId).not.toHaveBeenCalled();
    expect(writeAuditEvent).not.toHaveBeenCalled();
  });

  it("hard-fails when linking the task note (setTaskObsidianNoteId) rejects", async () => {
    vi.mocked(setTaskObsidianNoteId).mockRejectedValue(new Error("link failed"));

    await expect(
      createMaintenanceNote({ taskId: "task-42" }),
    ).rejects.toThrow("link failed");

    expect(upsertNoteByPath).toHaveBeenCalledTimes(1);
    expect(writeAuditEvent).not.toHaveBeenCalled();
  });

  it("persists the DB row as type: 'ticket' while the vault note's own frontmatter records type: maintenance — an intentional split tracked by #97/#98, not a bug", async () => {
    await createMaintenanceNote({ taskId: "task-42" });

    // DB side: notes.type has no CHECK value for "maintenance" (#97), so the
    // row is persisted as the compat value "ticket".
    expect(vi.mocked(upsertNoteByPath).mock.calls[0][0]).toMatchObject({
      type: "ticket",
      agent: "maintenance",
    });

    // Vault side: the frontmatter written to the note itself is the real
    // "maintenance" type — the reader (lib/obsidian/read.ts) is responsible
    // for reconciling this split back to "maintenance" (#98).
    const [, markdown] = vi.mocked(writeVaultNote).mock.calls[0];
    expect(markdown).toContain("type: maintenance");
    expect(markdown).toContain("agent: maintenance");
  });

  it("writes the audit event only after both Supabase writes succeed", async () => {
    await createMaintenanceNote({ taskId: "task-42" });

    const upsertOrder = vi.mocked(upsertNoteByPath).mock.invocationCallOrder[0];
    const linkOrder = vi.mocked(setTaskObsidianNoteId).mock.invocationCallOrder[0];
    const auditOrder = vi.mocked(writeAuditEvent).mock.invocationCallOrder[0];

    expect(auditOrder).toBeGreaterThan(upsertOrder);
    expect(auditOrder).toBeGreaterThan(linkOrder);
  });
});
