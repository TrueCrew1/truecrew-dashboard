import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  isVaultConfiguredMock,
  claimNextQueuedMaintenanceWorkItemMock,
  insertRuntimeExecutionJobMock,
  finishRuntimeExecutionJobMock,
  updateRuntimeWorkItemStatusMock,
  insertRuntimeArtifactMock,
  insertRuntimeSinkDeliveryMock,
  upsertNotesIndexRowMock,
  logMaintenanceMock,
  writeAuditEventMock,
} = vi.hoisted(() => ({
  isVaultConfiguredMock: vi.fn(),
  claimNextQueuedMaintenanceWorkItemMock: vi.fn(),
  insertRuntimeExecutionJobMock: vi.fn(),
  finishRuntimeExecutionJobMock: vi.fn(),
  updateRuntimeWorkItemStatusMock: vi.fn(),
  insertRuntimeArtifactMock: vi.fn(),
  insertRuntimeSinkDeliveryMock: vi.fn(),
  upsertNotesIndexRowMock: vi.fn(),
  logMaintenanceMock: vi.fn(),
  writeAuditEventMock: vi.fn(),
}));

vi.mock("../obsidian/config.js", () => ({
  isVaultConfigured: isVaultConfiguredMock,
}));

vi.mock("../obsidian/log.js", () => ({
  logMaintenance: logMaintenanceMock,
}));

vi.mock("../supabase/admin.js", () => ({
  writeAuditEvent: writeAuditEventMock,
}));

vi.mock("../supabase/runtime-queries.js", () => ({
  claimNextQueuedMaintenanceWorkItem: claimNextQueuedMaintenanceWorkItemMock,
  finishRuntimeExecutionJob: finishRuntimeExecutionJobMock,
  hashContent: (content: string) => `hash:${content.length}`,
  insertRuntimeArtifact: insertRuntimeArtifactMock,
  insertRuntimeExecutionJob: insertRuntimeExecutionJobMock,
  insertRuntimeSinkDelivery: insertRuntimeSinkDeliveryMock,
  updateRuntimeWorkItemStatus: updateRuntimeWorkItemStatusMock,
  upsertNotesIndexRow: upsertNotesIndexRowMock,
}));

import { processNextMaintenanceWorkItem } from "./pipeline.js";

const WORK_ITEM = {
  id: "wi-9",
  agent_role: "maintenance",
  trigger_type: "chief_approval",
  input_kind: "maintenance_task",
  input_payload: {
    title: "Replace HVAC filter — Unit 4",
    description: "Filter is past its service interval, swap for a MERV-13.",
    context: "Flagged during weekly walkthrough.",
  },
  status: "running",
  idempotency_key: null,
  requested_by: "operator",
  chief_proposal_id: null,
  created_at: "2026-07-08T00:00:00.000Z",
  updated_at: "2026-07-08T00:00:00.000Z",
};

beforeEach(() => {
  isVaultConfiguredMock.mockReturnValue(true);
  claimNextQueuedMaintenanceWorkItemMock.mockResolvedValue(WORK_ITEM);
  insertRuntimeExecutionJobMock.mockResolvedValue({ id: "job-9" });
  finishRuntimeExecutionJobMock.mockResolvedValue(undefined);
  updateRuntimeWorkItemStatusMock.mockResolvedValue(undefined);
  insertRuntimeArtifactMock.mockResolvedValue({ id: "artifact-9" });
  insertRuntimeSinkDeliveryMock.mockResolvedValue({ id: "delivery-9" });
  upsertNotesIndexRowMock.mockResolvedValue({ id: "note-9", created: true });
  logMaintenanceMock.mockResolvedValue({
    obsidianPath: "Operations/Maintenance/2026-07-08 — Replace HVAC filter — Unit 4.md",
    absolutePath: "/vault/Operations/Maintenance/2026-07-08 — Replace HVAC filter — Unit 4.md",
  });
  writeAuditEventMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("processNextMaintenanceWorkItem", () => {
  it("throws when the Obsidian vault is not configured", async () => {
    isVaultConfiguredMock.mockReturnValue(false);

    await expect(processNextMaintenanceWorkItem()).rejects.toThrow(
      /OBSIDIAN_VAULT_PATH is not configured/,
    );
    expect(claimNextQueuedMaintenanceWorkItemMock).not.toHaveBeenCalled();
  });

  it("returns null when there is no queued maintenance work item", async () => {
    claimNextQueuedMaintenanceWorkItemMock.mockResolvedValue(null);

    const result = await processNextMaintenanceWorkItem();

    expect(result).toBeNull();
    expect(insertRuntimeExecutionJobMock).not.toHaveBeenCalled();
  });

  it("writes the note, indexes it, and marks the work item completed on success", async () => {
    const result = await processNextMaintenanceWorkItem();

    expect(result).toEqual({
      workItemId: "wi-9",
      executionJobId: "job-9",
      obsidianPath: "Operations/Maintenance/2026-07-08 — Replace HVAC filter — Unit 4.md",
      noteId: "note-9",
    });

    expect(logMaintenanceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Replace HVAC filter — Unit 4",
        description: "Filter is past its service interval, swap for a MERV-13.",
      }),
    );

    expect(insertRuntimeArtifactMock).toHaveBeenNthCalledWith(1, {
      executionJobId: "job-9",
      artifactKind: "obsidian_note",
      uri: "Operations/Maintenance/2026-07-08 — Replace HVAC filter — Unit 4.md",
      contentHash: expect.any(String),
      metadata: { title: "Replace HVAC filter — Unit 4", type: "maintenance" },
    });

    expect(insertRuntimeSinkDeliveryMock).toHaveBeenNthCalledWith(1, {
      artifactId: "artifact-9",
      sink: "obsidian",
      status: "delivered",
      details: { obsidianPath: "Operations/Maintenance/2026-07-08 — Replace HVAC filter — Unit 4.md" },
    });

    expect(upsertNotesIndexRowMock).toHaveBeenCalledWith({
      title: "Replace HVAC filter — Unit 4",
      obsidianPath: "Operations/Maintenance/2026-07-08 — Replace HVAC filter — Unit 4.md",
      summary: "Flagged during weekly walkthrough.",
      requestedBy: "operator",
    });

    expect(finishRuntimeExecutionJobMock).toHaveBeenCalledWith(
      "job-9",
      "succeeded",
      expect.any(Array),
    );
    expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-9", "completed");
  });

  it("does not let a failing audit-log write fail the pipeline (fail open per ADR-001)", async () => {
    writeAuditEventMock.mockRejectedValue(new Error("audit sink unreachable"));

    await expect(processNextMaintenanceWorkItem()).resolves.toEqual(
      expect.objectContaining({ workItemId: "wi-9" }),
    );
    expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-9", "completed");
  });

  it("marks the work item failed and rethrows when payload validation fails", async () => {
    claimNextQueuedMaintenanceWorkItemMock.mockResolvedValue({
      ...WORK_ITEM,
      input_payload: { title: "", description: "" },
    });

    await expect(processNextMaintenanceWorkItem()).rejects.toThrow(
      /maintenance_task payload requires title/,
    );

    expect(finishRuntimeExecutionJobMock).toHaveBeenCalledWith(
      "job-9",
      "failed",
      expect.any(Array),
      "maintenance_task payload requires title",
    );
    expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-9", "failed");
  });

  it("marks the work item failed and rethrows when the obsidian sink delivery fails (hard-fail, not fail-open)", async () => {
    insertRuntimeSinkDeliveryMock.mockRejectedValue(new Error("sink delivery table unreachable"));

    await expect(processNextMaintenanceWorkItem()).rejects.toThrow(
      /sink delivery table unreachable/,
    );

    expect(finishRuntimeExecutionJobMock).toHaveBeenCalledWith(
      "job-9",
      "failed",
      expect.any(Array),
      "sink delivery table unreachable",
    );
    expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-9", "failed");
    expect(upsertNotesIndexRowMock).not.toHaveBeenCalled();
  });
});
