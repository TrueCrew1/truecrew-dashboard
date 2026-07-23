import type { ResearchRequestStatus } from "../../../lib/research/status";

/** How a research queue row entered the system. */
export type ResearchRequestSource = "adapter" | "session";

/** Operator-visible research workflow state — no auto-runner implied. Single
 * source of truth is lib/research/status.ts, shared with the API route. */
export type { ResearchRequestStatus };

export interface ResearchRequest {
  id: string;
  topic: string;
  whyItMatters: string;
  suggestedOutcome: string;
  createdAt: string;
  updatedAt: string;
  source: ResearchRequestSource;
  status: ResearchRequestStatus;
  /** Repo-relative path when status is done; session-backed until committed. */
  filedPath?: string;
  blockerNote?: string;
}

export const RESEARCH_STATUS_LABEL: Record<ResearchRequestStatus, string> = {
  queued: "Queued",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
};

/** Canonical finding path for the M&S estimating-roadmap V1 slice. */
export const MS_ESTIMATING_ROADMAP_FINDING_PATH =
  "knowledge/findings/m-and-s/estimating-roadmap.md";
