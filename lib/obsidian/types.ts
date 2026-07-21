export type ObsidianLogKind = "build" | "decision" | "pr" | "hot-context";

export interface BuildLogEntry {
  result: "success" | "failure" | "cancelled" | "unknown";
  branch?: string;
  commit?: string;
  notes?: string;
  loggedAt?: Date;
}

/** Controlled tag vocabulary — Knowledge Architecture V1 [M]. Never invent tags outside this list. */
export const DECISION_CONTROLLED_TAGS = [
  "truecrew",
  "dashboard",
  "infra",
  "tooling",
  "agents",
  "ux",
  "governance",
  "daily",
] as const;

export type DecisionControlledTag = (typeof DECISION_CONTROLLED_TAGS)[number];

export interface DecisionLogEntry {
  title: string;
  /** [M] one line, plain text — must be enough to triage the note from this alone. */
  summary: string;
  context?: string;
  decision: string;
  alternatives?: string;
  /** Renders under "## Impact / risk" — replaces the old, unstructured "consequences" field. */
  impact?: string;
  followUps?: string;
  /** Spec default is "active"; only "deprecated" needs to be passed explicitly. */
  status?: "active" | "deprecated";
  /** Must be a subset of DECISION_CONTROLLED_TAGS; defaults to ["truecrew"]. */
  tags?: DecisionControlledTag[];
  /** Note titles (no brackets) to link — capped at 3 per spec; rendered as quoted wikilinks. */
  related?: string[];
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

export interface ObsidianWriteResult {
  obsidianPath: string;
  absolutePath: string;
}
