/**
 * Shared stage-change gate warnings for operator UI.
 *
 * Limitations (intentional for this slice):
 * - Uses window.confirm (temporary; replace with in-app modal later)
 * - Frontend-only; API does not enforce gate rules on PATCH /api/tasks/:id
 * - Gated targets are fixed: Review, Done, Logged
 * - resolveTaskGates uses the first linked task for multi-task workflows
 */
import type { GateCheck } from "../src/types";
import { WorkflowStage } from "../src/types";

/** Stages that should warn when required gates are still open. */
export const GATE_CHECK_TARGET_STAGES: ReadonlySet<WorkflowStage> = new Set([
  WorkflowStage.Review,
  WorkflowStage.Done,
  WorkflowStage.Logged,
]);

/** Terminal close-out stages — always confirm, even when all gates pass. */
export const CLOSEOUT_STAGES: ReadonlySet<WorkflowStage> = new Set([
  WorkflowStage.Done,
  WorkflowStage.Logged,
]);

type TaskGateSource = { id: string; gates: GateCheck[] };
type WorkflowGateSource = {
  id: string;
  linkedTaskIds: string[];
  gates: GateCheck[];
};

export function resolveTaskGates(
  entityId: string,
  tasks: TaskGateSource[],
  workflows: WorkflowGateSource[],
): GateCheck[] {
  const task = tasks.find((entry) => entry.id === entityId);
  if (task) return task.gates;

  const workflow = workflows.find((entry) => entry.id === entityId);
  if (!workflow) return [];

  const linkedTask = tasks.find((entry) => workflow.linkedTaskIds.includes(entry.id));
  return linkedTask?.gates ?? workflow.gates;
}

export function getBlockingGates(gates: GateCheck[]): GateCheck[] {
  return gates.filter((gate) => gate.required && !gate.passed);
}

export function stageChangeRequiresGateWarning(next: WorkflowStage): boolean {
  return GATE_CHECK_TARGET_STAGES.has(next);
}

export function formatOpenGateSummary(blockingGates: GateCheck[]): string {
  if (blockingGates.length === 0) return "";
  const labels = blockingGates.map((gate) => gate.label).join(", ");
  return `${blockingGates.length} required gate(s) still open: ${labels}.`;
}

/**
 * Returns true when the operator confirms (or no warning is needed).
 * Review warns only when gates are open; Done/Logged always confirm close-out.
 */
export function confirmGatedStageChange(
  next: WorkflowStage,
  blockingGates: GateCheck[],
): boolean {
  const openGateSummary = formatOpenGateSummary(blockingGates);
  const openGateBlock = openGateSummary ? `${openGateSummary}\n\n` : "";

  if (next === WorkflowStage.Logged) {
    return window.confirm(
      `${openGateBlock}Move to Logged? This archives the task from active workflows.`,
    );
  }

  if (next === WorkflowStage.Done) {
    const trailing =
      blockingGates.length > 0 ? " Open gates will remain unresolved." : "";
    return window.confirm(
      `${openGateBlock}Move to Done? Confirm work is complete.${trailing}`,
    );
  }

  if (next === WorkflowStage.Review) {
    if (blockingGates.length === 0) return true;
    return window.confirm(
      `${openGateBlock}Move to Review anyway? Required gates should be cleared before sign-off.`,
    );
  }

  return true;
}

export function shouldConfirmStageChange(
  next: WorkflowStage,
  blockingGates: GateCheck[],
): boolean {
  if (CLOSEOUT_STAGES.has(next)) return true;
  if (next === WorkflowStage.Review && blockingGates.length > 0) return true;
  return false;
}

export function resolveStageChange(
  next: WorkflowStage,
  blockingGates: GateCheck[],
): boolean {
  if (!shouldConfirmStageChange(next, blockingGates)) return true;
  return confirmGatedStageChange(next, blockingGates);
}
