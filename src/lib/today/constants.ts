import type { TodayCrew, TodaySlaTier } from "./types";

/** Org-wide in-progress capacity (crew WIP), not personal limit. */
export const CREW_CAPACITY = 12;

export const STALE_DAYS = 3;

export const PRIORITY_SCORES: Record<string, number> = {
  critical: 50,
  high: 30,
  medium: 10,
  low: 0,
};

export const SLA_HOURS: Record<TodaySlaTier, number> = {
  critical: 4,
  standard: 24,
  routine: 72,
};

export const CREW_LABELS: Record<TodayCrew, string> = {
  field: "Field",
  maintenance: "Maintenance",
  operations: "Operations",
  admin: "Admin",
};

export const SLA_LABELS: Record<TodaySlaTier, string> = {
  critical: "Critical SLA (4h)",
  standard: "Standard SLA (24h)",
  routine: "Routine SLA (72h)",
};

export const OPEN_STAGES = new Set(["Inbox", "Triage", "Planned"]);
export const TERMINAL_STAGES = new Set(["Done", "Logged"]);

export function slaDueFromTier(tier: TodaySlaTier, from = new Date()): string {
  const due = new Date(from.getTime() + SLA_HOURS[tier] * 3_600_000);
  return due.toISOString();
}
