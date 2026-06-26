import { WorkflowStage } from "@/types";
import type {
  CrewCapacity,
  TodayFilters,
  TodayTask,
} from "./types";

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const SLA_ORDER = { p0: 0, p1: 1, p2: 2, p3: 3 } as const;

const CREW_CAPACITY: Record<TodayTask["crew"], number> = {
  platform: 3,
  support: 2,
  founder: 2,
  operator: 2,
};

const CREW_LABELS: Record<TodayTask["crew"], string> = {
  platform: "Platform",
  support: "Support",
  founder: "Founder",
  operator: "Operator",
};

export function applyTodayFilters(
  tasks: TodayTask[],
  filters: TodayFilters,
): TodayTask[] {
  return tasks.filter((task) => {
    if (filters.site !== "all" && task.site !== filters.site) return false;
    if (filters.crew !== "all" && task.crew !== filters.crew) return false;
    if (filters.slaTier !== "all" && task.slaTier !== filters.slaTier) return false;
    return true;
  });
}

export function selectMit(tasks: TodayTask[]): TodayTask | null {
  return tasks.find((t) => t.isMit) ?? null;
}

export function selectInProgress(tasks: TodayTask[]): TodayTask[] {
  return tasks
    .filter((t) => t.stage === WorkflowStage.InProgress)
    .sort((a, b) => comparePriority(a, b));
}

export function selectPriorityQueue(tasks: TodayTask[]): TodayTask[] {
  const actionable = tasks.filter(
    (t) =>
      !t.isMit &&
      t.stage !== WorkflowStage.InProgress &&
      t.stage !== WorkflowStage.Waiting &&
      t.stage !== WorkflowStage.Done &&
      t.stage !== WorkflowStage.Logged,
  );
  return actionable.sort((a, b) => comparePriority(a, b));
}

export function selectOverdue(tasks: TodayTask[]): TodayTask[] {
  const now = Date.now();
  return tasks
    .filter((t) => {
      const slaDue = t.slaDueAt ? new Date(t.slaDueAt).getTime() : null;
      const due = t.dueAt ? new Date(t.dueAt).getTime() : null;
      const deadline = slaDue ?? due;
      return deadline !== null && deadline < now && t.stage !== WorkflowStage.Done;
    })
    .sort((a, b) => {
      const aDue = new Date(a.slaDueAt ?? a.dueAt ?? 0).getTime();
      const bDue = new Date(b.slaDueAt ?? b.dueAt ?? 0).getTime();
      return aDue - bDue;
    });
}

export function selectBlockers(tasks: TodayTask[]): TodayTask[] {
  return tasks
    .filter(
      (t) =>
        t.stage === WorkflowStage.Waiting ||
        Boolean(t.blocker),
    )
    .sort((a, b) => comparePriority(a, b));
}

export function computeCrewCapacity(tasks: TodayTask[]): CrewCapacity[] {
  const inProgress = selectInProgress(tasks);
  const crews = Object.keys(CREW_CAPACITY) as TodayTask["crew"][];

  return crews.map((crew) => {
    const count = inProgress.filter((t) => t.crew === crew).length;
    const capacity = CREW_CAPACITY[crew];
    return {
      crew,
      label: CREW_LABELS[crew],
      inProgress: count,
      capacity,
      utilization: capacity > 0 ? Math.round((count / capacity) * 100) : 0,
    };
  });
}

function comparePriority(a: TodayTask, b: TodayTask): number {
  const slaDiff = SLA_ORDER[a.slaTier] - SLA_ORDER[b.slaTier];
  if (slaDiff !== 0) return slaDiff;
  const priDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (priDiff !== 0) return priDiff;
  const aDue = a.slaDueAt ? new Date(a.slaDueAt).getTime() : Infinity;
  const bDue = b.slaDueAt ? new Date(b.slaDueAt).getTime() : Infinity;
  return aDue - bDue;
}

export function isOverdue(task: TodayTask): boolean {
  const deadline = task.slaDueAt ?? task.dueAt;
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

export function formatSlaRemaining(task: TodayTask): string {
  const deadline = task.slaDueAt ?? task.dueAt;
  if (!deadline) return "—";

  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) {
    const hours = Math.abs(Math.floor(diff / 3600000));
    if (hours < 24) return `${hours}h overdue`;
    return `${Math.floor(hours / 24)}d overdue`;
  }
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}
