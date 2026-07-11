import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  isVaultConfiguredMock,
  claimNextQueuedPlannerWorkItemMock,
  insertRuntimeExecutionJobMock,
  finishRuntimeExecutionJobMock,
  updateRuntimeWorkItemStatusMock,
  insertRuntimeArtifactMock,
  insertRuntimeSinkDeliveryMock,
  upsertNotesIndexRowMock,
  logPlanningMock,
  writeAuditEventMock,
  getChiefApprovalDecisionMock,
  insertPlannerApprovedTaskMock,
} = vi.hoisted(() => ({
  isVaultConfiguredMock: vi.fn(),
  claimNextQueuedPlannerWorkItemMock: vi.fn(),
  insertRuntimeExecutionJobMock: vi.fn(),
  finishRuntimeExecutionJobMock: vi.fn(),
  updateRuntimeWorkItemStatusMock: vi.fn(),
  insertRuntimeArtifactMock: vi.fn(),
  insertRuntimeSinkDeliveryMock: vi.fn(),
  upsertNotesIndexRowMock: vi.fn(),
  logPlanningMock: vi.fn(),
  writeAuditEventMock: vi.fn(),
  getChiefApprovalDecisionMock: vi.fn(),
  insertPlannerApprovedTaskMock: vi.fn(),
}));

vi.mock("../obsidian/config.js", () => ({
  isVaultConfigured: isVaultConfiguredMock,
}));

vi.mock("../obsidian/log.js", () => ({
  logPlanning: logPlanningMock,
}));

vi.mock("../supabase/admin.js", () => ({
  writeAuditEvent: writeAuditEventMock,
}));

vi.mock("../supabase/queries.js", () => ({
  getChiefApprovalDecision: getChiefApprovalDecisionMock,
  insertPlannerApprovedTask: insertPlannerApprovedTaskMock,
}));

vi.mock("../supabase/runtime-queries.js", () => ({
  claimNextQueuedPlannerWorkItem: claimNextQueuedPlannerWorkItemMock,
  finishRuntimeExecutionJob: finishRuntimeExecutionJobMock,
  hashContent: (content: string) => `hash:${content.length}`,
  insertRuntimeArtifact: insertRuntimeArtifactMock,
  insertRuntimeExecutionJob: insertRuntimeExecutionJobMock,
  insertRuntimeSinkDelivery: insertRuntimeSinkDeliveryMock,
  updateRuntimeWorkItemStatus: updateRuntimeWorkItemStatusMock,
  upsertNotesIndexRow: upsertNotesIndexRowMock,
}));

import { processNextPlannerWorkItem } from "./pipeline.js";

const WORK_ITEM = {
  id: "wi-11",
  agent_role: "planner",
  trigger_type: "chief_approval",
  input_kind: "planning_task",
  input_payload: {
    title: "Start Phase 4 — Alerts & Escalation",
    description: "Kick off urgency buckets and inline tags on pending approvals.",
    context: "Phase 3 (Persistence) has shipped.",
  },
  status: "running",
  idempotency_key: null,
  requested_by: "operator",
  chief_proposal_id: null,
  created_at: "2026-07-10T00:00:00.000Z",
  updated_at: "2026-07-10T00:00:00.000Z",
};

beforeEach(() => {
  isVaultConfiguredMock.mockReturnValue(true);
  claimNextQueuedPlannerWorkItemMock.mockResolvedValue(WORK_ITEM);
  insertRuntimeExecutionJobMock.mockResolvedValue({ id: "job-11" });
  finishRuntimeExecutionJobMock.mockResolvedValue(undefined);
  updateRuntimeWorkItemStatusMock.mockResolvedValue(undefined);
  insertRuntimeArtifactMock.mockResolvedValue({ id: "artifact-11" });
  insertRuntimeSinkDeliveryMock.mockResolvedValue({ id: "delivery-11" });
  upsertNotesIndexRowMock.mockResolvedValue({ id: "note-11", created: true });
  logPlanningMock.mockResolvedValue({
    obsidianPath: "Operations/Planning/2026-07-10 — Start Phase 4 — Alerts & Escalation.md",
    absolutePath:
      "/vault/Operations/Planning/2026-07-10 — Start Phase 4 — Alerts & Escalation.md",
  });
  writeAuditEventMock.mockResolvedValue(undefined);
  getChiefApprovalDecisionMock.mockResolvedValue(null);
  insertPlannerApprovedTaskMock.mockResolvedValue({ id: "task-99" });
});

afterEach(() => {
  vi.clearAllMocks();
});

/** Shared assertion for the hard-fail path: job + work item both marked failed with `message`. */
function expectHardFail(message: string) {
  expect(finishRuntimeExecutionJobMock).toHaveBeenCalledWith(
    "job-11",
    "failed",
    expect.any(Array),
    message,
  );
  expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-11", "failed");
}

describe("processNextPlannerWorkItem", () => {
  it("throws when the Obsidian vault is not configured", async () => {
    isVaultConfiguredMock.mockReturnValue(false);

    await expect(processNextPlannerWorkItem()).rejects.toThrow(
      /OBSIDIAN_VAULT_PATH is not configured/,
    );
    expect(claimNextQueuedPlannerWorkItemMock).not.toHaveBeenCalled();
  });

  it("returns null when there is no queued planner work item", async () => {
    claimNextQueuedPlannerWorkItemMock.mockResolvedValue(null);

    const result = await processNextPlannerWorkItem();

    expect(result).toBeNull();
    expect(insertRuntimeExecutionJobMock).not.toHaveBeenCalled();
  });

  it("writes the note, indexes it, and marks the work item completed on success", async () => {
    const result = await processNextPlannerWorkItem();

    expect(result).toEqual({
      workItemId: "wi-11",
      executionJobId: "job-11",
      obsidianPath: "Operations/Planning/2026-07-10 — Start Phase 4 — Alerts & Escalation.md",
      noteId: "note-11",
      taskId: null,
    });
    expect(insertPlannerApprovedTaskMock).not.toHaveBeenCalled();

    expect(logPlanningMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Start Phase 4 — Alerts & Escalation",
        description: "Kick off urgency buckets and inline tags on pending approvals.",
      }),
    );

    expect(insertRuntimeArtifactMock).toHaveBeenNthCalledWith(1, {
      executionJobId: "job-11",
      artifactKind: "obsidian_note",
      uri: "Operations/Planning/2026-07-10 — Start Phase 4 — Alerts & Escalation.md",
      contentHash: expect.any(String),
      metadata: { title: "Start Phase 4 — Alerts & Escalation", type: "planning" },
    });

    expect(insertRuntimeSinkDeliveryMock).toHaveBeenNthCalledWith(1, {
      artifactId: "artifact-11",
      sink: "obsidian",
      status: "delivered",
      details: {
        obsidianPath: "Operations/Planning/2026-07-10 — Start Phase 4 — Alerts & Escalation.md",
      },
    });

    expect(upsertNotesIndexRowMock).toHaveBeenCalledWith({
      title: "Start Phase 4 — Alerts & Escalation",
      obsidianPath: "Operations/Planning/2026-07-10 — Start Phase 4 — Alerts & Escalation.md",
      summary: "Phase 3 (Persistence) has shipped.",
      requestedBy: "operator",
    });

    expect(finishRuntimeExecutionJobMock).toHaveBeenCalledWith(
      "job-11",
      "succeeded",
      expect.any(Array),
    );
    expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-11", "completed");
  });

  it("does not let a failing audit-log write fail the pipeline (fail open per ADR-001)", async () => {
    writeAuditEventMock.mockRejectedValue(new Error("audit sink unreachable"));

    await expect(processNextPlannerWorkItem()).resolves.toEqual(
      expect.objectContaining({ workItemId: "wi-11" }),
    );
    expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-11", "completed");
  });

  it("marks the work item failed and rethrows when payload validation fails", async () => {
    claimNextQueuedPlannerWorkItemMock.mockResolvedValue({
      ...WORK_ITEM,
      input_payload: { title: "", description: "" },
    });

    await expect(processNextPlannerWorkItem()).rejects.toThrow(
      /planning_task payload requires title/,
    );

    expectHardFail("planning_task payload requires title");
  });

  it("marks the work item failed and rethrows when the vault write fails", async () => {
    logPlanningMock.mockRejectedValue(new Error("disk full"));

    await expect(processNextPlannerWorkItem()).rejects.toThrow(/disk full/);

    expectHardFail("disk full");
    expect(insertRuntimeArtifactMock).not.toHaveBeenCalled();
  });

  it("marks the work item failed and rethrows when the obsidian sink delivery fails (hard-fail, not fail-open)", async () => {
    insertRuntimeSinkDeliveryMock.mockRejectedValue(new Error("sink delivery table unreachable"));

    await expect(processNextPlannerWorkItem()).rejects.toThrow(
      /sink delivery table unreachable/,
    );

    expectHardFail("sink delivery table unreachable");
    expect(upsertNotesIndexRowMock).not.toHaveBeenCalled();
  });

  it("does not fire an audit event when the pipeline hard-fails (audit only follows a successful write)", async () => {
    insertRuntimeSinkDeliveryMock.mockRejectedValue(new Error("sink delivery table unreachable"));

    await expect(processNextPlannerWorkItem()).rejects.toThrow(
      /sink delivery table unreachable/,
    );

    expect(writeAuditEventMock).not.toHaveBeenCalled();
  });

  describe("bounded task-creation action (Chief-approved only)", () => {
    const APPROVED_WORK_ITEM = { ...WORK_ITEM, chief_proposal_id: "apr-42" };

    it("creates a tasks row when chief_proposal_id resolves to an approved decision", async () => {
      claimNextQueuedPlannerWorkItemMock.mockResolvedValue(APPROVED_WORK_ITEM);
      getChiefApprovalDecisionMock.mockResolvedValue({
        proposal_id: "apr-42",
        status: "approved",
        decided_at: "2026-07-10T00:00:00.000Z",
        actor: "operator",
      });

      const result = await processNextPlannerWorkItem();

      expect(getChiefApprovalDecisionMock).toHaveBeenCalledWith("apr-42");
      expect(insertPlannerApprovedTaskMock).toHaveBeenCalledWith({
        title: "Start Phase 4 — Alerts & Escalation",
        description: "Kick off urgency buckets and inline tags on pending approvals.",
        createdBy: "operator",
      });
      expect(insertRuntimeArtifactMock).toHaveBeenNthCalledWith(3, {
        executionJobId: "job-11",
        artifactKind: "index_row",
        uri: "supabase:tasks:task-99",
        contentHash: expect.any(String),
        metadata: { taskId: "task-99", stage: "Planned", chiefProposalId: "apr-42" },
      });
      expect(writeAuditEventMock).toHaveBeenCalledWith(
        "task",
        "task-99",
        "planner.task.created_from_approval",
        { workItemId: "wi-11", chiefProposalId: "apr-42" },
        "planner_agent",
      );
      expect(result?.taskId).toBe("task-99");
    });

    it("skips task creation when the decision is not approved (e.g. rejected)", async () => {
      claimNextQueuedPlannerWorkItemMock.mockResolvedValue(APPROVED_WORK_ITEM);
      getChiefApprovalDecisionMock.mockResolvedValue({
        proposal_id: "apr-42",
        status: "rejected",
        decided_at: "2026-07-10T00:00:00.000Z",
        actor: "operator",
      });

      const result = await processNextPlannerWorkItem();

      expect(insertPlannerApprovedTaskMock).not.toHaveBeenCalled();
      expect(result?.taskId).toBeNull();
      expect(updateRuntimeWorkItemStatusMock).toHaveBeenCalledWith("wi-11", "completed");
    });

    it("skips task creation when no decision exists yet for the proposal", async () => {
      claimNextQueuedPlannerWorkItemMock.mockResolvedValue(APPROVED_WORK_ITEM);
      getChiefApprovalDecisionMock.mockResolvedValue(null);

      const result = await processNextPlannerWorkItem();

      expect(insertPlannerApprovedTaskMock).not.toHaveBeenCalled();
      expect(result?.taskId).toBeNull();
    });

    it("marks the work item failed and rethrows when task creation fails after approval is confirmed", async () => {
      claimNextQueuedPlannerWorkItemMock.mockResolvedValue(APPROVED_WORK_ITEM);
      getChiefApprovalDecisionMock.mockResolvedValue({
        proposal_id: "apr-42",
        status: "approved",
        decided_at: "2026-07-10T00:00:00.000Z",
        actor: "operator",
      });
      insertPlannerApprovedTaskMock.mockRejectedValue(new Error("tasks insert failed"));

      await expect(processNextPlannerWorkItem()).rejects.toThrow(/tasks insert failed/);

      expectHardFail("tasks insert failed");
      expect(writeAuditEventMock).not.toHaveBeenCalled();
    });
  });
});
