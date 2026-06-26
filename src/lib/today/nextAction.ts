import { WorkflowStage } from "@/types";
import type { NextAction, TodayTask } from "./types";
import { isOverdue } from "./selectors";

const SLA_ORDER = { p0: 0, p1: 1, p2: 2, p3: 3 } as const;
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

/**
 * Rule-based next action selection:
 * 1. MIT in actionable stage
 * 2. Highest-priority overdue task
 * 3. In-progress task with open blocker
 * 4. Highest SLA inbox/triage item
 * 5. Next priority queue item
 */
export function computeNextAction(tasks: TodayTask[]): NextAction | null {
  if (tasks.length === 0) return null;

  const mit = tasks.find((t) => t.isMit);
  if (mit && isActionable(mit)) {
    return {
      taskId: mit.id,
      title: mit.title,
      reason: "Most Important Now — your designated focus item",
      urgency: mit.slaTier === "p0" ? "critical" : "high",
      slaDueAt: mit.slaDueAt,
    };
  }

  const overdue = tasks
    .filter((t) => isOverdue(t) && isActionable(t))
    .sort((a, b) => scoreUrgency(b) - scoreUrgency(a));

  if (overdue.length > 0) {
    const task = overdue[0];
    return {
      taskId: task.id,
      title: task.title,
      reason: `SLA breached — ${task.slaTier.toUpperCase()} deadline passed`,
      urgency: "critical",
      slaDueAt: task.slaDueAt,
    };
  }

  const blocked = tasks
    .filter(
      (t) =>
        t.stage === WorkflowStage.InProgress &&
        t.blocker &&
        isActionable(t),
    )
    .sort((a, b) => scoreUrgency(b) - scoreUrgency(a));

  if (blocked.length > 0) {
    const task = blocked[0];
    return {
      taskId: task.id,
      title: task.title,
      reason: `Unblock in-progress work — ${task.blocker}`,
      urgency: "high",
      slaDueAt: task.slaDueAt,
    };
  }

  const inbox = tasks
    .filter(
      (t) =>
        (t.stage === WorkflowStage.Inbox || t.stage === WorkflowStage.Triage) &&
        isActionable(t),
    )
    .sort((a, b) => scoreUrgency(b) - scoreUrgency(a));

  if (inbox.length > 0) {
    const task = inbox[0];
    return {
      taskId: task.id,
      title: task.title,
      reason: `${task.stage} item needs triage — ${task.slaTier.toUpperCase()} SLA`,
      urgency: task.slaTier === "p0" || task.slaTier === "p1" ? "high" : "normal",
      slaDueAt: task.slaDueAt,
    };
  }

  const inProgress = tasks
    .filter((t) => t.stage === WorkflowStage.InProgress)
    .sort((a, b) => scoreUrgency(b) - scoreUrgency(a));

  if (inProgress.length > 0) {
    const task = inProgress[0];
    return {
      taskId: task.id,
      title: task.title,
      reason: "Continue active work — highest SLA in progress",
      urgency: "normal",
      slaDueAt: task.slaDueAt,
    };
  }

  const queued = tasks
    .filter((t) => isActionable(t))
    .sort((a, b) => scoreUrgency(b) - scoreUrgency(a));

  if (queued.length > 0) {
    const task = queued[0];
    return {
      taskId: task.id,
      title: task.title,
      reason: "Next in priority queue",
      urgency: "normal",
      slaDueAt: task.slaDueAt,
    };
  }

  return null;
}

function isActionable(task: TodayTask): boolean {
  return (
    task.stage !== WorkflowStage.Done &&
    task.stage !== WorkflowStage.Logged
  );
}

function scoreUrgency(task: TodayTask): number {
  const slaScore = (4 - SLA_ORDER[task.slaTier]) * 100;
  const priScore = (4 - PRIORITY_ORDER[task.priority]) * 10;
  const overdueBonus = isOverdue(task) ? 1000 : 0;
  const mitBonus = task.isMit ? 500 : 0;
  return slaScore + priScore + overdueBonus + mitBonus;
}
