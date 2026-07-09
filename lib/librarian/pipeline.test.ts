import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  isVaultConfiguredMock,
  claimNextQueuedLibrarianWorkItemMock,
  insertRuntimeExecutionJobMock,
  finishRuntimeExecutionJobMock,
  updateRuntimeWorkItemStatusMock,
  insertRuntimeArtifactMock,
  insertRuntimeSinkDeliveryMock,
  upsertNotesIndexRowMock,
  logDecisionMock,
  writeAuditEventMock,
} = vi.hoisted(() => ({
  isVaultConfiguredMock: vi.fn(),
  claimNextQueuedLibrarianWorkItemMock: vi.fn(),
  insertRuntimeExecutionJobMock: vi.fn(),
  finishRuntimeExecutionJobMock: vi.fn(),
  updateRuntimeWorkItemStatusMock: vi.fn(),
  insertRuntimeArtifactMock: vi.fn(),
  insertRuntimeSinkDeliveryMock: vi.fn(),
  upsertNotesIndexRowMock: vi.fn(),
  logDecisionMock: vi.fn(),
  writeAuditEventMock: vi.fn(),
}));

vi.mock("../obsidian/config.js", () => ({
  isVaultConfigured: isVaultConfiguredMock,
}));

vi.mock("../obsidian/log.js", () => ({
  logDecision: logDecisionMock,
}));

vi.mock("../supabase/admin.js", () => ({
  writeAuditEvent: writeAuditEventMock,
}));

vi.mock("../supabase/runtime-queries.js", () => ({
  claimNextQueuedLibrarianWorkItem: claimNextQueuedLibrarianWorkItemMock,
  finishRuntimeExecutionJob: finishRuntimeExecutionJobMock,
  hashContent: (content: string) => `hash:${content.length}`,
  insertRuntimeArtifact: insertRuntimeArtifactMock,
  insertRuntimeExecutionJob: insertRuntimeExecutionJobMock,
  insertRuntimeSinkDelivery: insertRuntimeSinkDeliveryMock,
  updateRuntimeWorkItemStatus: updateRuntimeWorkItemStatusMock,
  upsertNotesIndexRow: upsertNotesIndexRowMock,
}));

import { processNextLibrarianWorkItem } from "./pipeline.js";

const WORK_ITEM = {
  id: "wi-1",
  agent_role: "librarian",
  trigger_type: "chief_approval",
  input_kind: "chief_decision",
  input_payload: {
    title: "Override gates for tsk-001",
    decision: "Approved. Document reason and advance.",
    context: "Build task has open gates.",
  },
  status: "running",
  idempotency_key: null,
  requested_by: "founder",
  chief_proposal_id: null,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
};

beforeEach(() => {
  isVaultConfiguredMock.mockReturnValue(true);
  claimNextQueuedLibrarianWorkItemMock.mockResolvedValue(WORK_ITEM);
  insertRuntimeExecutionJobMock.mockResolvedValue({ id: "job-1" });
  finishRuntimeExecutionJobMock.mockResolvedValue(undefined);
  updateRuntimeWorkItemStatusMock.mockResolvedValue(undefined);
  insertRuntimeArtifactMock.mockResolvedValue({ id: "artifact-1" });
  insertRuntimeSinkDeliveryMock.mockResolvedValue({ id: "delivery-1" });
  upsertNotesIndexRowMock.mockResolvedValue({ id: "note-1", created: true });
  logDecisionMock.mockResolvedValue({
    obsidianPath: "Decisions/2026-07-01-override-gates.md",
    absolutePath: "/vault/Decisions/2026-07-01-override-gates.md",
  });
  writeAuditEventMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("processNextLibrarianWorkItem", () => {
  it("throws when the Obsidian vault is not configured", async () => {
    isVaultConfiguredMock.mockReturnValue(false);

    await expect(processNextLibrarianWorkItem()).rejects.toThrow(
      /OBSIDIAN_VAULT_PATH is not configured/,
    );
    expect(claimNextQueuedLibrarianWorkItemMock).not.toHaveBeenCalled();
  });

  it("returns null when there is no queued librarian work item", async () => {
    claimNextQueuedLibrarianWorkItemMock.mockResolvedValue(null);

    const result = await processNextLibrarianWorkItem();

    expect(result).toBeNull();
    expect(insertRuntimeExecutionJobMock).not.toHaveBeenCalled();
  });

  it("writes the note, indexes it, and marks the work item completed on success", async () => {
    const result = await processNextLibrarianWorkItem();

    expect(result).toEqual({
      workItemId: "wi-1",
      executionJobId: "job-1",
      obsidianPath: "Decisions/2026-07-01-override-gates.md",
      noteId: "note-1",
    });

    expect(logDecisionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Override gates for tsk-001",
        decision: "Approved. Document reason and advance.",
      }),
    );

    expect(insertRuntimeArtifactMock).toHaveBeenNthCalledWith(1, {
      executionJobId: "job-1",
      artifactKind: "obsidian_note",
      uri: "Decisions/2026-07-01-override-gates.md",
      contentHash: expect.any(String),
      metadata: { title: "Override gates for tsk-001", type: "decision" },
    });

    expect(insertRuntimeSinkDeliveryMock).toHaveBeenNthCalledWith(1, {
      artifactId: "artifact-1",
      sink: "obsidian",
      status: "delivered",
      details: { obsidianPath: "Decisions/2026-07-01-override-gates.md" },
    });

    expect(upsertNotesIndexRowMock).toHaveBeenCalledWith({
      title: "Override gates for tsk-001",
      obsidianPath: "Decisions/2026-07-01-override-gates.md",
      summary: "Build task has open gates.",
      requestedBy: "founder",
    });

    expect(finishRuntimeExecutionJobMock).toHaveBeenCalledWith(
      "job-1",
      "succeeded",
      expect.any(Array),
    );
    expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-1", "completed");
  });

  it("does not let a failing audit-log write fail the pipeline (fail open per ADR-001)", async () => {
    writeAuditEventMock.mockRejectedValue(new Error("audit sink unreachable"));

    await expect(processNextLibrarianWorkItem()).resolves.toEqual(
      expect.objectContaining({ workItemId: "wi-1" }),
    );
    expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-1", "completed");
  });

  it("marks the work item failed and rethrows when payload validation fails", async () => {
    claimNextQueuedLibrarianWorkItemMock.mockResolvedValue({
      ...WORK_ITEM,
      input_payload: { title: "", decision: "" },
    });

    await expect(processNextLibrarianWorkItem()).rejects.toThrow(
      /chief_decision payload requires title/,
    );

    expect(finishRuntimeExecutionJobMock).toHaveBeenCalledWith(
      "job-1",
      "failed",
      expect.any(Array),
      "chief_decision payload requires title",
    );
    expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-1", "failed");
  });

  it("marks the work item failed and rethrows when the vault write fails", async () => {
    logDecisionMock.mockRejectedValue(new Error("disk full"));

    await expect(processNextLibrarianWorkItem()).rejects.toThrow(/disk full/);

    expect(finishRuntimeExecutionJobMock).toHaveBeenCalledWith(
      "job-1",
      "failed",
      expect.any(Array),
      "disk full",
    );
    expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-1", "failed");
    expect(insertRuntimeArtifactMock).not.toHaveBeenCalled();
  });

  it("marks the work item failed and rethrows when the obsidian sink delivery fails (hard-fail, not fail-open)", async () => {
    insertRuntimeSinkDeliveryMock.mockRejectedValue(new Error("sink delivery table unreachable"));

    await expect(processNextLibrarianWorkItem()).rejects.toThrow(
      /sink delivery table unreachable/,
    );

    expect(finishRuntimeExecutionJobMock).toHaveBeenCalledWith(
      "job-1",
      "failed",
      expect.any(Array),
      "sink delivery table unreachable",
    );
    expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-1", "failed");
    expect(upsertNotesIndexRowMock).not.toHaveBeenCalled();
  });
});
