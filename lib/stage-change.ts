/**
 * Shared stage-change gate warnings for operator UI.
 *
 * Limitations (intentional for this slice):
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
 * Message shown before a gated stage change. Review warns only when gates are
 * open; Done/Logged always confirm close-out. Returns null when no prompt.
 */
export function buildStageChangeConfirmMessage(
  next: WorkflowStage,
  blockingGates: GateCheck[],
): string | null {
  const openGateSummary = formatOpenGateSummary(blockingGates);
  const openGateBlock = openGateSummary ? `${openGateSummary}\n\n` : "";

  if (next === WorkflowStage.Logged) {
    return `${openGateBlock}Move to Logged? This archives the task from active workflows.`;
  }

  if (next === WorkflowStage.Done) {
    const trailing =
      blockingGates.length > 0 ? " Open gates will remain unresolved." : "";
    return `${openGateBlock}Move to Done? Confirm work is complete.${trailing}`;
  }

  if (next === WorkflowStage.Review) {
    if (blockingGates.length === 0) return null;
    return `${openGateBlock}Move to Review anyway? Required gates should be cleared before sign-off.`;
  }

  return null;
}

export type StageChangeConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  defaultFocus: "confirm" | "cancel";
};

/** Modal title and primary action for gated stage changes (message copy unchanged). */
export function buildStageChangeConfirmOptions(
  next: WorkflowStage,
  blockingGates: GateCheck[],
): StageChangeConfirmOptions | null {
  const message = buildStageChangeConfirmMessage(next, blockingGates);
  if (!message) return null;

  const hasBlocking = blockingGates.length > 0;

  if (next === WorkflowStage.Logged) {
    return {
      title: hasBlocking ? "Open gates remain" : "Archive task",
      message,
      confirmLabel: "Move to Logged",
      defaultFocus: hasBlocking ? "cancel" : "confirm",
    };
  }

  if (next === WorkflowStage.Done) {
    return {
      title: hasBlocking ? "Open gates remain" : "Confirm close-out",
      message,
      confirmLabel: "Move to Done",
      defaultFocus: hasBlocking ? "cancel" : "confirm",
    };
  }

  if (next === WorkflowStage.Review) {
    return {
      title: "Open gates remain",
      message,
      confirmLabel: "Move to Review anyway",
      defaultFocus: "cancel",
    };
  }

  return null;
}

export function shouldConfirmStageChange(
  next: WorkflowStage,
  blockingGates: GateCheck[],
): boolean {
  if (CLOSEOUT_STAGES.has(next)) return true;
  if (next === WorkflowStage.Review && blockingGates.length > 0) return true;
  return false;
}

export async function resolveStageChange(
  next: WorkflowStage,
  blockingGates: GateCheck[],
  confirm: (options: StageChangeConfirmOptions) => Promise<boolean>,
): Promise<boolean> {
  if (!shouldConfirmStageChange(next, blockingGates)) return true;
  const options = buildStageChangeConfirmOptions(next, blockingGates);
  if (!options) return true;
  return confirm(options);
}
