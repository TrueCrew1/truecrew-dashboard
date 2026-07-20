export type ReadinessStatus = "ready" | "partial" | "blocked" | "not_wired";

export type OperationalReadinessDomainId =
  | "chief"
  | "builder"
  | "librarian"
  | "repo-hygiene"
  | "integrations"
  | "reporting";

export interface OperationalReadinessDomain {
  id: OperationalReadinessDomainId;
  label: string;
  status: ReadinessStatus;
  summary: string;
  blockers: string[];
  warnings: string[];
  partialNotes: string[];
}

export interface OperationalReadinessSummary {
  generatedAt: string;
  overallStatus: ReadinessStatus;
  domains: OperationalReadinessDomain[];
  blockers: string[];
  warnings: string[];
  partialOrNotWired: string[];
  sources: string[];
}
