import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { Task, GateCheck, WorkflowStage } from "@/types";

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
  /** Planner-suggested next steps, derived from this task's own fields — advisory only. */
  plannerChecklist: string[];
}

/** Stages a task can no longer meaningfully be "awaiting gates" in. */
const TERMINAL_STAGES: readonly WorkflowStage[] = [WorkflowStage.Done, WorkflowStage.Logged];

function toPendingGate(gate: GateCheck): PendingGate {
  return { key: gate.id, name: gate.label, description: gate.label };
}

/** A task's real, required-but-unpassed gates — driven by its own gate data, not a hardcoded list. */
function getPendingGates(task: Task): PendingGate[] {
  return task.gates.filter((gate) => gate.required && !gate.passed).map(toPendingGate);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Short, generic "next steps" checklist for a build task, derived only from
 * fields already on the task — no new data source. Advisory guidance for the
 * operator, not an automation trigger.
 */
function getPlannerChecklist(task: Task, pendingGates: PendingGate[]): string[] {
  const scope = task.description || task.title;
  const steps = [`Scope: ${truncate(scope, 70)}`];
  pendingGates.forEach((gate) => steps.push(`Clear gate: ${gate.name}`));
  steps.push("Run lint + tsc + build");
  steps.push("Verify in browser");
  return steps;
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
    plannerChecklist: getPlannerChecklist(task, pendingGates),
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
