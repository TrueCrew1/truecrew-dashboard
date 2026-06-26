import type { TodayTask, TodayFilters } from "./types";
import {
  OPEN_STAGES,
  PRIORITY_SCORES,
  STALE_DAYS,
  TERMINAL_STAGES,
} from "./constants";

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

export function isActive(task: TodayTask): boolean {
  return !TERMINAL_STAGES.has(task.stage);
}

export function isOverdue(task: TodayTask): boolean {
  if (!task.due_at || TERMINAL_STAGES.has(task.stage)) return false;
  return new Date(task.due_at) < startOfToday();
}

export function daysOverdue(task: TodayTask): number {
  return isOverdue(task) ? daysSince(task.due_at) : 0;
}

export function isSlaBreaching(task: TodayTask): boolean {
  if (!task.due_at || TERMINAL_STAGES.has(task.stage)) return false;
  return new Date(task.due_at) < new Date();
}

export function isStale(task: TodayTask): boolean {
  return task.stage === "In Progress" && daysSince(task.updated_at) >= STALE_DAYS;
}

export function hasBlockingGates(task: TodayTask): boolean {
  return (task.gate_checks ?? []).some((g) => g.required && !g.passed);
}

export function isBlocker(task: TodayTask): boolean {
  return Boolean(task.blocker?.trim()) || hasBlockingGates(task);
}

export function isWaiting(task: TodayTask): boolean {
  return task.stage === "Waiting";
}

export function scoreTask(task: TodayTask): number {
  if (!isActive(task)) return -Infinity;

  let score = PRIORITY_SCORES[task.priority] ?? 10;

  if (isBlocker(task) && !isWaiting(task)) score += 70;
  if (isStale(task)) score += 40;
  if (isOverdue(task)) score += 100 + Math.min(daysOverdue(task) * 5, 50);
  else if (task.due_at) {
    const due = new Date(task.due_at);
    const now = new Date();
    if (due.toDateString() === now.toDateString()) score += 60;
    else if (due <= new Date(now.getTime() + 7 * 86_400_000)) score += 30;
  }

  if (isSlaBreaching(task)) score += 45;
  if (!task.assignee) score += 20;

  score += Math.min(daysSince(task.created_at) * 2, 40);
  return score;
}

export function scoreReasons(task: TodayTask): string[] {
  const reasons: string[] = [];
  if (isBlocker(task)) reasons.push("Blocked");
  if (isStale(task)) reasons.push(`Stale — ${daysSince(task.updated_at)}d`);
  if (!task.assignee) reasons.push("Unassigned");
  if (isOverdue(task)) reasons.push(`${daysOverdue(task)}d overdue`);
  else if (isSlaBreaching(task)) reasons.push("SLA breach");
  else if (task.due_at) {
    const due = new Date(task.due_at);
    if (due.toDateString() === new Date().toDateString()) reasons.push("Due today");
  }
  if (task.sla_tier === "critical") reasons.push("Critical SLA");
  return reasons;
}

export function applyTodayFilters(tasks: TodayTask[], filters: TodayFilters): TodayTask[] {
  return tasks.filter((task) => {
    if (filters.site !== "all" && task.site_name !== filters.site) return false;
    if (filters.crew !== "all" && task.crew !== filters.crew) return false;
    if (filters.sla === "breaching" && !isSlaBreaching(task)) return false;
    if (filters.sla !== "all" && filters.sla !== "breaching" && task.sla_tier !== filters.sla) {
      return false;
    }
    return true;
  });
}

export function deriveFilterOptions(tasks: TodayTask[]) {
  const sites = [...new Set(tasks.map((t) => t.site_name).filter(Boolean))] as string[];
  const crews = [...new Set(tasks.map((t) => t.crew).filter(Boolean))] as string[];
  return {
    sites: sites.sort(),
    crews: crews.sort(),
  };
}

export function partitionTodayZones(tasks: TodayTask[]) {
  const active = tasks.filter(isActive);

  const inProgress = active.filter((t) => t.stage === "In Progress");
  const waiting = active.filter(isWaiting);
  const blockers = active.filter((t) => isBlocker(t) && !isWaiting(t));
  const overdue = active.filter(
    (t) => isOverdue(t) && t.stage !== "Waiting" && !TERMINAL_STAGES.has(t.stage),
  );

  const priorityQueue = active
    .filter(
      (t) =>
        OPEN_STAGES.has(t.stage) &&
        !isOverdue(t) &&
        t.stage !== "In Progress" &&
        t.stage !== "Waiting",
    )
    .sort((a, b) => scoreTask(b) - scoreTask(a));

  const mit =
    [...active].sort((a, b) => scoreTask(b) - scoreTask(a)).find((t) => scoreTask(t) > -Infinity) ??
    null;

  return {
    mit,
    inProgress,
    priorityQueue,
    overdue: [...overdue].sort((a, b) => daysOverdue(b) - daysOverdue(a)),
    blockers,
    waiting,
  };
}
