export type ObsidianLogKind =
  | "build"
  | "decision"
  | "pr"
  | "hot-context"
  | "maintenance"
  | "planning"
  | "research-finding";

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

/**
 * One filed Research Finding — see docs/OBSIDIAN_RESEARCH_INTAKE.md's "Fixed-field
 * template: Research Finding Intake" for the canonical field set this mirrors.
 */
export type ResearchFindingTier = "Log" | "Lesson" | "Starter-Pass-candidate";

export interface ResearchFindingLogEntry {
  title: string;
  sourcesChecked: string;
  finding: string;
  worked?: string;
  failed?: string;
  nextTime?: string;
  tier?: ResearchFindingTier;
  dedupeCheck?: string;
  relatedApprovalRequest?: string;
  relatedPr?: string;
  loggedAt?: Date;
}

export interface ObsidianWriteResult {
  obsidianPath: string;
  absolutePath: string;
}
