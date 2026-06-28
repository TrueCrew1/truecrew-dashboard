import { getSupabaseAdmin } from "../supabase/admin";

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
  "Inbox",
  "Triage",
  "Planned",
  "In Progress",
  "Waiting",
  "Review",
] as const;

export const ACTIVE_INCIDENT_STATUSES = ["open", "mitigating", "mitigated"] as const;

export const SHIFT_STAT_LINKS = {
  openWorkOrders: "/operations?filter=open-work-orders",
  overduePMs: "/operations?filter=overdue-pms",
  activeIncidents: "/monitor?filter=active-incidents",
} as const;

export type OperationsFilter = "open-work-orders" | "overdue-pms";
export type MonitorFilter = "active-incidents";

export const OPERATIONS_FILTER_LABELS: Record<OperationsFilter, string> = {
  "open-work-orders": "Open work orders",
  "overdue-pms": "Overdue PMs",
};

export const MONITOR_FILTER_LABELS: Record<MonitorFilter, string> = {
  "active-incidents": "Active incidents",
};

function isOpenTaskStage(stage: string): boolean {
  return (OPEN_TASK_STAGES as readonly string[]).includes(stage);
}

function isActiveIncidentStatus(status: string): boolean {
  return (ACTIVE_INCIDENT_STATUSES as readonly string[]).includes(status);
}

export function isOpenWorkOrderTask(task: ShiftStatsSource["tasks"][number]): boolean {
  return (
    (task.workflowType === "repair" || task.workflowType === "ticket") &&
    isOpenTaskStage(task.stage)
  );
}

export function isOverduePMTask(
  task: ShiftStatsSource["tasks"][number],
  now = Date.now(),
): boolean {
  if (!task.dueAt || !isOpenTaskStage(task.stage)) return false;
  return new Date(task.dueAt).getTime() < now;
}

export function isActiveIncident(incident: ShiftStatsSource["incidents"][number]): boolean {
  return isActiveIncidentStatus(incident.status);
}

export function parseOperationsFilter(
  value: string | null,
): OperationsFilter | null {
  if (value === "open-work-orders" || value === "overdue-pms") return value;
  return null;
}

export function parseMonitorFilter(value: string | null): MonitorFilter | null {
  if (value === "active-incidents") return value;
  return null;
}

export function filterOperationsTasks<T extends ShiftStatsSource["tasks"][number]>(
  tasks: T[],
  filter: OperationsFilter | null,
): T[] {
  if (filter === "open-work-orders") return tasks.filter(isOpenWorkOrderTask);
  if (filter === "overdue-pms") return tasks.filter((task) => isOverduePMTask(task));
  return tasks;
}

export function filterMonitorIncidents<T extends ShiftStatsSource["incidents"][number]>(
  incidents: T[],
  filter: MonitorFilter | null,
): T[] {
  if (filter === "active-incidents") return incidents.filter(isActiveIncident);
  return incidents;
}

export function deriveShiftStats(source: ShiftStatsSource): ShiftStats {
  const openWorkOrders = source.tasks.filter(isOpenWorkOrderTask).length;
  const overduePMs = source.tasks.filter((task) => isOverduePMTask(task)).length;
  const activeIncidents = source.incidents.filter(isActiveIncident).length;

  return { openWorkOrders, overduePMs, activeIncidents };
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
