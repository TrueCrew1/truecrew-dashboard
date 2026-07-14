import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { Task, GateCheck, WorkflowStage } from "@/types";
import { formatChiefTimestamp } from "../chiefMock";

export interface PendingGate {
  key: string;
  name: string;
  description: string;
}

export interface BuildGateTask {
  id: string;
  title: string;
  detail: string;
  meta?: string;
  tone: "neutral" | "warn" | "critical";
  routeTo: string;
  routeLabel: string;
  timestamp?: string;
  pendingGates: PendingGate[];
  /** Short, advisory "why this first" line — derived only from this task's own fields. */
  priorityReason: string;
}

/** Gates due within this window are called out as "due soon" rather than just listed. */
const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Stages a task can no longer meaningfully be "awaiting gates" in. */
const TERMINAL_STAGES: readonly WorkflowStage[] = [WorkflowStage.Done, WorkflowStage.Logged];

function toPendingGate(gate: GateCheck): PendingGate {
  return { key: gate.id, name: gate.label, description: gate.label };
}

/** A task's real, required-but-unpassed gates — driven by its own gate data, not a hardcoded list. */
function getPendingGates(task: Task): PendingGate[] {
  return task.gates.filter((gate) => gate.required && !gate.passed).map(toPendingGate);
}

/**
 * Short, advisory "why this first" line for a build-gate task — every branch reads
 * straight off Task/PendingGate fields already on the object, nothing inferred.
 */
function getPriorityReason(task: Task, pendingGates: PendingGate[]): string {
  if (task.dueAt) {
    const dueAtMs = new Date(task.dueAt).getTime();
    const nowMs = Date.now();
    if (dueAtMs < nowMs) return `Overdue since ${formatChiefTimestamp(task.dueAt)}`;
    if (dueAtMs - nowMs <= DUE_SOON_WINDOW_MS) {
      return `Due soon — ${formatChiefTimestamp(task.dueAt)}`;
    }
  }

  if (task.blocker) return `Blocked: ${task.blocker}`;

  if (task.priority === "critical") return "Marked critical priority";

  const blockedDeploy = task.linkedEntities.find((entity) => entity.type === "deploy");
  if (blockedDeploy) return `Blocks deploy: ${blockedDeploy.label}`;

  if (pendingGates.length > 1) return `${pendingGates.length} required gates still open`;

  return `Required gate pending: ${pendingGates[0].name}`;
}

function mapTaskToBuildGateTask(task: Task): BuildGateTask | null {
  const pendingGates = getPendingGates(task);
  if (pendingGates.length === 0) return null;

  const isOverdue = Boolean(task.dueAt && new Date(task.dueAt) < new Date());
  const tone = isOverdue ? "critical" : pendingGates.length > 2 ? "warn" : "neutral";

  return {
    id: task.id,
    title: task.title,
    detail: task.description || "Build task awaiting required gates",
    meta: task.priority,
    tone,
    routeTo: `/tasks/${task.id}`,
    routeLabel: "task",
    timestamp: task.updatedAt || task.createdAt,
    pendingGates,
    priorityReason: getPriorityReason(task, pendingGates),
  };
}

export function useBuildTasks(): {
  buildGateTasks: BuildGateTask[];
  isLoading: boolean;
  error: string | null;
} {
  const { tasks, loading, error } = useData();

  const buildGateTasks = useMemo(
    () =>
      (tasks as Task[])
        .filter((task) => task.workflowType === "build" && !TERMINAL_STAGES.includes(task.stage))
        .map(mapTaskToBuildGateTask)
        .filter((task): task is BuildGateTask => task !== null),
    [tasks],
  );

  return { buildGateTasks, isLoading: loading, error };
}
