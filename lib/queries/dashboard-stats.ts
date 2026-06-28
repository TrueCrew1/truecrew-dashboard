export const OPEN_TASK_STAGES = [
  "Inbox",
  "Triage",
  "Planned",
  "In Progress",
  "Waiting",
  "Review",
] as const;

export const ACTIVE_INCIDENT_STATUSES = ["open", "mitigating", "mitigated"] as const;

export type OperationsFilter = "open-work-orders" | "overdue-pms";
export type MonitorFilter = "active-incidents";

export const OPERATIONS_FILTER_LABELS: Record<OperationsFilter, string> = {
  "open-work-orders": "Open work orders",
  "overdue-pms": "Overdue PMs",
};

export const MONITOR_FILTER_LABELS: Record<MonitorFilter, string> = {
  "active-incidents": "Active incidents",
};

type TaskFilterFields = {
  workflowType: string;
  stage: string;
  dueAt?: string;
};

type IncidentFilterFields = {
  status: string;
};

function isOpenTaskStage(stage: string): boolean {
  return (OPEN_TASK_STAGES as readonly string[]).includes(stage);
}

function isActiveIncidentStatus(status: string): boolean {
  return (ACTIVE_INCIDENT_STATUSES as readonly string[]).includes(status);
}

export function isOpenWorkOrderTask(task: TaskFilterFields): boolean {
  return (
    (task.workflowType === "repair" || task.workflowType === "ticket") &&
    isOpenTaskStage(task.stage)
  );
}

export function isOverduePMTask(task: TaskFilterFields, now = Date.now()): boolean {
  if (!task.dueAt || !isOpenTaskStage(task.stage)) return false;
  return new Date(task.dueAt).getTime() < now;
}

export function isActiveIncident(incident: IncidentFilterFields): boolean {
  return isActiveIncidentStatus(incident.status);
}

export function parseOperationsFilter(value: string | null): OperationsFilter | null {
  if (value === "open-work-orders" || value === "overdue-pms") return value;
  return null;
}

export function parseMonitorFilter(value: string | null): MonitorFilter | null {
  if (value === "active-incidents") return value;
  return null;
}

export function filterOperationsTasks<T extends TaskFilterFields>(
  tasks: T[],
  filter: OperationsFilter | null,
): T[] {
  if (filter === "open-work-orders") return tasks.filter(isOpenWorkOrderTask);
  if (filter === "overdue-pms") return tasks.filter((task) => isOverduePMTask(task));
  return tasks;
}

export function filterMonitorIncidents<T extends IncidentFilterFields>(
  incidents: T[],
  filter: MonitorFilter | null,
): T[] {
  if (filter === "active-incidents") return incidents.filter(isActiveIncident);
  return incidents;
}
