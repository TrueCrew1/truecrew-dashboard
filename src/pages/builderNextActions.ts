import type { Task, TaskPriority } from "@/types";
import { isOpenTaskStage } from "../../lib/queries/dashboard-stats";
import { getBlockingGates, formatOpenGateSummary } from "../../lib/stage-change";
import { WorkflowStage } from "@/types";

export type BuilderActionTone = "critical" | "warn" | "neutral";

export interface BuilderNextAction {
  id: string;
  task: Task;
  actionLabel: "Unblock" | "Review" | "Continue";
  reason: string;
  tone: BuilderActionTone;
}

const MAX_BUILDER_NEXT_ACTIONS = 5;

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const ACTIVE_STAGES = new Set<WorkflowStage>([
  WorkflowStage.InProgress,
  WorkflowStage.Waiting,
  WorkflowStage.Review,
]);

interface ScoredAction extends BuilderNextAction {
  rank: number;
}

/**
 * Ranks open build tasks by how urgently Builder should act on them, using
 * only fields already on Task (blocker, gates, dueAt, priority, stage) — the
 * same signal chiefLiveContext.ts already reads for deriveBuildAgentWorkItems.
 * Each task surfaces at most one reason (its most urgent), so a task never
 * appears twice. Tasks matching none of the ranked conditions are left out
 * rather than padded in to hit a target count.
 */
export function deriveBuilderNextActions(tasks: Task[]): BuilderNextAction[] {
  const now = Date.now();

  const scored: ScoredAction[] = [];

  for (const task of tasks) {
    if (task.workflowType !== "build" || !isOpenTaskStage(task.stage)) continue;

    const blockingGates = getBlockingGates(task.gates);
    const isBlocked = blockingGates.length > 0 || Boolean(task.blocker);
    const isOverdue = Boolean(task.dueAt) && new Date(task.dueAt as string).getTime() < now;
    const isHighPriority = task.priority === "critical" || task.priority === "high";
    const isActive = ACTIVE_STAGES.has(task.stage);

    const blockerReason = task.blocker
      ? `Blocked: ${task.blocker}`
      : `Gate open: ${formatOpenGateSummary(blockingGates)}`;

    let entry: Omit<ScoredAction, "id" | "task"> | null = null;

    if (isBlocked && isOverdue) {
      entry = { rank: 0, tone: "critical", actionLabel: "Unblock", reason: `${blockerReason} — overdue since ${task.dueAt}` };
    } else if (isBlocked) {
      entry = { rank: 1, tone: "critical", actionLabel: "Unblock", reason: blockerReason };
    } else if (isOverdue) {
      entry = { rank: 2, tone: "warn", actionLabel: "Review", reason: `Overdue since ${task.dueAt}` };
    } else if (isHighPriority && isActive) {
      entry = { rank: 3, tone: "neutral", actionLabel: "Continue", reason: `Active, ${task.priority} priority` };
    }

    if (entry) {
      scored.push({ id: `builder-next-${task.id}`, task, ...entry });
    }
  }

  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return PRIORITY_WEIGHT[a.task.priority] - PRIORITY_WEIGHT[b.task.priority];
  });

  return scored.slice(0, MAX_BUILDER_NEXT_ACTIONS);
}
