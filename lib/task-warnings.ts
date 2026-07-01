import {
  NO_CUSTOMER_LINKED,
  resolveCustomerForTask,
  type TaskContextData,
} from "./task-context.js";
import { isOpenTaskStage } from "./queries/dashboard-stats.js";
import type { GateCheck, Task, WorkflowStage } from "../src/types/index.js";

export type TaskWarningKind =
  | "external_dependency"
  | "gate_open"
  | "missing_data"
  | "time_gate"
  | "waiting"
  | "readiness";

export interface TaskWarning {
  kind: TaskWarningKind;
  /** Short label shown inline on task rows */
  label: string;
  /** Longer context for tooltips / screen readers */
  detail: string;
}

const WARNING_PRIORITY: TaskWarningKind[] = [
  "external_dependency",
  "time_gate",
  "gate_open",
  "missing_data",
  "waiting",
  "readiness",
];

const CUSTOMER_FACING_TYPES = new Set(["onboarding", "ticket"]);

export function getOpenRequiredGates(gates: GateCheck[]): GateCheck[] {
  return gates.filter((gate) => gate.required && !gate.passed);
}

function truncate(text: string, max = 72): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function isPastDue(task: Task, now = Date.now()): boolean {
  if (!task.dueAt || !isOpenTaskStage(task.stage)) return false;
  return new Date(task.dueAt).getTime() < now;
}

/** Collect all applicable warnings for a task (ordered by priority). */
export function deriveTaskWarnings(
  task: Task,
  context?: TaskContextData,
): TaskWarning[] {
  const warnings: TaskWarning[] = [];
  const openGates = getOpenRequiredGates(task.gates);

  if (task.blocker?.trim()) {
    const detail = task.blocker.trim();
    warnings.push({
      kind: "external_dependency",
      label: `Blocked · ${truncate(detail, 48)}`,
      detail,
    });
  }

  if (isPastDue(task)) {
    const dueLabel = new Date(task.dueAt!).toLocaleDateString();
    warnings.push({
      kind: "time_gate",
      label: "Past due",
      detail: `Due date passed (${dueLabel})`,
    });
  }

  if (openGates.length > 0) {
    const gateLabels = openGates.map((gate) => gate.label).join(" · ");
    const primary = openGates[0].label;
    warnings.push({
      kind: "gate_open",
      label:
        openGates.length === 1
          ? `Gate open · ${truncate(primary, 40)}`
          : `Gates open (${openGates.length}) · ${truncate(primary, 32)}`,
      detail: gateLabels,
    });
  }

  if (context && CUSTOMER_FACING_TYPES.has(task.workflowType)) {
    const customer = resolveCustomerForTask(task, context.customers, {
      allowTitleMatch: false,
    });
    if (customer.source === "none") {
      warnings.push({
        kind: "missing_data",
        label: "Missing customer link",
        detail: NO_CUSTOMER_LINKED,
      });
    }
  }

  if (task.stage === ("Waiting" as WorkflowStage) && !task.blocker?.trim()) {
    warnings.push({
      kind: "waiting",
      label: "Waiting on external party",
      detail: "Task is in Waiting stage with no recorded blocker",
    });
  }

  if (
    task.workflowType === "build" &&
    isOpenTaskStage(task.stage) &&
    !task.githubRef?.trim() &&
    !openGates.some((gate) => /github|branch|pr/i.test(gate.label))
  ) {
    warnings.push({
      kind: "readiness",
      label: "No GitHub ref linked",
      detail: "Build task has no branch or PR reference",
    });
  }

  return warnings.sort(
    (a, b) => WARNING_PRIORITY.indexOf(a.kind) - WARNING_PRIORITY.indexOf(b.kind),
  );
}

/** Highest-priority warning to show inline (one per row). */
export function derivePrimaryTaskWarning(
  task: Task,
  context?: TaskContextData,
): TaskWarning | null {
  const warnings = deriveTaskWarnings(task, context);
  return warnings[0] ?? null;
}

export function taskHasWarning(task: Task, context?: TaskContextData): boolean {
  return derivePrimaryTaskWarning(task, context) !== null;
}
