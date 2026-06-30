import { getSupabaseAdmin } from "../supabase/admin.js";
import type { Incident, Task } from "../../src/types/index.js";
import { WorkflowStage } from "../../src/types/index.js";

export interface ShiftStats {
  openWorkOrders: number;
  overduePMs: number;
  activeIncidents: number;
}

export interface ShiftStatsSource {
  tasks: Array<{
    workflowType: string;
    stage: string;
    dueAt?: string;
  }>;
  incidents: Array<{
    status: string;
  }>;
}

export const OPEN_TASK_STAGES = [
  WorkflowStage.Inbox,
  WorkflowStage.Triage,
  WorkflowStage.Planned,
  WorkflowStage.InProgress,
  WorkflowStage.Waiting,
  WorkflowStage.Review,
] as const;

export const ACTIVE_INCIDENT_STATUSES = ["open", "mitigating", "mitigated"] as const;

export type ShiftFilter =
  | "open-work-orders"
  | "overdue-pms"
  | "active-incidents";

export const SHIFT_STAT_LINKS = {
  openWorkOrders: "/operations?filter=open-work-orders",
  overduePMs: "/operations?filter=overdue-pms",
  activeIncidents: "/monitor?filter=active-incidents",
} as const;

export const SHIFT_FILTER_LABELS: Record<ShiftFilter, string> = {
  "open-work-orders": "Open work orders",
  "overdue-pms": "Overdue PMs",
  "active-incidents": "Active incidents",
};

const OPEN_TASK_STAGE_SET = new Set<string>(OPEN_TASK_STAGES);

function isOpenTaskStage(stage: string): boolean {
  return OPEN_TASK_STAGE_SET.has(stage);
}

function isActiveIncidentStatus(status: string): boolean {
  return (ACTIVE_INCIDENT_STATUSES as readonly string[]).includes(status);
}

export function deriveShiftStats(source: ShiftStatsSource): ShiftStats {
  const now = Date.now();

  const openWorkOrders = source.tasks.filter(
    (task) =>
      (task.workflowType === "repair" || task.workflowType === "ticket") &&
      isOpenTaskStage(task.stage),
  ).length;

  const overduePMs = source.tasks.filter((task) => {
    if (!task.dueAt || !isOpenTaskStage(task.stage)) return false;
    return new Date(task.dueAt).getTime() < now;
  }).length;

  const activeIncidents = source.incidents.filter((incident) =>
    isActiveIncidentStatus(incident.status),
  ).length;

  return { openWorkOrders, overduePMs, activeIncidents };
}

export function filterTasksByShiftParam(tasks: Task[], filter: string | null): Task[] {
  if (filter === "open-work-orders") {
    return tasks.filter(
      (task) =>
        (task.workflowType === "repair" || task.workflowType === "ticket") &&
        isOpenTaskStage(task.stage),
    );
  }
  if (filter === "overdue-pms") {
    const now = Date.now();
    return tasks.filter(
      (task) =>
        Boolean(task.dueAt) &&
        isOpenTaskStage(task.stage) &&
        new Date(task.dueAt!).getTime() < now,
    );
  }
  return tasks;
}

export function filterIncidentsByShiftParam(
  incidents: Incident[],
  filter: string | null,
): Incident[] {
  if (filter === "active-incidents") {
    return incidents.filter((inc) => isActiveIncidentStatus(inc.status));
  }
  return incidents;
}

export async function fetchShiftStats(): Promise<ShiftStats> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const [openWorkOrdersRes, overduePMsRes, activeIncidentsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .in("workflow_type", ["repair", "ticket"])
      .in("stage", [...OPEN_TASK_STAGES]),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .in("stage", [...OPEN_TASK_STAGES])
      .not("due_at", "is", null)
      .lt("due_at", now),
    supabase
      .from("incidents")
      .select("*", { count: "exact", head: true })
      .in("status", [...ACTIVE_INCIDENT_STATUSES]),
  ]);

  const error =
    openWorkOrdersRes.error ?? overduePMsRes.error ?? activeIncidentsRes.error;
  if (error) throw error;

  return {
    openWorkOrders: openWorkOrdersRes.count ?? 0,
    overduePMs: overduePMsRes.count ?? 0,
    activeIncidents: activeIncidentsRes.count ?? 0,
  };
}
