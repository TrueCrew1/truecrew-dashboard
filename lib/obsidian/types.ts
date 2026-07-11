export type ObsidianLogKind =
  | "build"
  | "decision"
  | "pr"
  | "hot-context"
  | "maintenance"
  | "planning";

export interface BuildLogEntry {
  result: "success" | "failure" | "cancelled" | "unknown";
  branch?: string;
  commit?: string;
  notes?: string;
  loggedAt?: Date;
}

export interface DecisionLogEntry {
  title: string;
  context?: string;
  decision: string;
  consequences?: string;
  loggedAt?: Date;
}

export interface PrLogEntry {
  number: number;
  title: string;
  url?: string;
  status: "opened" | "merged" | "closed" | "updated";
  notes?: string;
  loggedAt?: Date;
}

export interface HotContextEntry {
  body: string;
  loggedAt?: Date;
}

export interface MaintenanceLogEntry {
  title: string;
  description: string;
  context?: string;
  notes?: string;
  loggedAt?: Date;
}

export interface PlanningLogEntry {
  title: string;
  description: string;
  context?: string;
  notes?: string;
  loggedAt?: Date;
}

export interface ObsidianWriteResult {
  obsidianPath: string;
  absolutePath: string;
}
