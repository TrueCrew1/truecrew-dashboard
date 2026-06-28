import type { MockData } from "@/data/mockData";

export interface ShiftStats {
  focusQueue: number;
  blockingGates: number;
  activeIncidents: number;
}

export const SHIFT_STAT_LINKS = {
  focusQueue: "/",
  blockingGates: "/operations",
  activeIncidents: "/monitor",
} as const;

const OPEN_TASK_STAGES = new Set([
  "Inbox",
  "Triage",
  "Planned",
  "In Progress",
  "Waiting",
  "Review",
]);

const ACTIVE_INCIDENT_STATUSES = new Set(["open", "mitigating", "mitigated"]);

export function deriveShiftStats(source: Pick<MockData, "focusItems" | "tasks" | "incidents">): ShiftStats {
  const blockingGates = source.tasks.filter((task) =>
    task.gates.some((gate) => gate.required && !gate.passed),
  ).length;

  const activeIncidents = source.incidents.filter(
    (incident) =>
      incident.severity <= 2 && ACTIVE_INCIDENT_STATUSES.has(incident.status),
  ).length;

  return {
    focusQueue: source.focusItems.length,
    blockingGates,
    activeIncidents,
  };
}

export function isOpenTaskStage(stage: string): boolean {
  return OPEN_TASK_STAGES.has(stage);
}
