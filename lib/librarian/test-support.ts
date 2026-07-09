import { WorkflowStage, type Task } from "../../src/types";

/**
 * Shared client-`Task` factory for Librarian unit tests. Test-only helper — not
 * imported by any production entrypoint.
 */
export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-7",
    title: "Rebuild pump station telemetry",
    description: "Swap the failed telemetry board and re-run calibration.",
    stage: WorkflowStage.Done,
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
