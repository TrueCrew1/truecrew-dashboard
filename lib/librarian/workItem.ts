import { WorkflowStage, type Task, type WorkItem, type WorkItemStatus } from "../../src/types";
import { getBlockingGates } from "../stage-change";

const FILING_STAGES = new Set<WorkflowStage>([WorkflowStage.Done, WorkflowStage.Logged]);

export function isObsidianFilingCandidate(task: Task): boolean {
  return FILING_STAGES.has(task.stage);
}

export function workItemFromTask(task: Task, hasArtifact: boolean): WorkItem {
  let status: WorkItemStatus;

  if (hasArtifact) {
    status = "filed";
  } else if (!FILING_STAGES.has(task.stage)) {
    status = "pending";
  } else if (task.blocker || getBlockingGates(task.gates).length > 0) {
    status = "blocked";
  } else {
    status = "active";
  }

  return {
    id: task.id,
    type: "obsidian_filing",
    source: task.workflowType,
    status,
  };
}
