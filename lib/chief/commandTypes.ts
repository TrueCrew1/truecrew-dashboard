/**
 * Shared Chief command request/response shapes for the API and client.
 * Deterministic routing + optional AI fallback both produce ChiefCommandResult.
 */

import type {
  AlertItem,
  Customer,
  Deploy,
  FocusItem,
  Incident,
  Note,
  Prompt,
  Runbook,
  Task,
  Workflow,
} from "../../src/types/index.js";

export type ChiefCommandSource = "home" | "sidebar" | "topbar";

export type ChiefCommandResolution =
  | "deterministic"
  | "ai_fallback"
  | "ai_fallback_unavailable";

export type ChiefCommandSpecialist =
  | "Workflow Gate Agent"
  | "Librarian Agent"
  | "Research Agent"
  | "Roadmap Agent"
  | "Marketer Agent"
  | "Chief";

export interface ChiefCommandSpecialistContribution {
  specialist: Exclude<ChiefCommandSpecialist, "Chief">;
  contribution: string;
}

/** Serializable ops snapshot the command router needs. */
export interface ChiefCommandLiveContext {
  stats: {
    openWorkOrders: number;
    overduePMs: number;
  };
  focusItems: FocusItem[];
  alerts: AlertItem[];
  openTaskCount: number;
  blockingTasks: Task[];
  overdueTasks: Task[];
  tasksMissingCustomer: Task[];
  tasksMissingWorkflow: Task[];
  activeIncidents: Incident[];
  blockedDeploys: Deploy[];
  waitingCustomers: Customer[];
}

export interface ChiefCommandKnowledgeLibrary {
  runbooks: Pick<Runbook, "title" | "tags">[];
  prompts: Pick<Prompt, "title" | "tags">[];
  notes: Pick<Note, "title">[];
}

/** Minimal approval fields used by the approvals/alerts resolvers. */
export interface ChiefCommandApprovalCandidate {
  id: string;
  title: string;
  summary: string;
  status: "pending" | "approved" | "rejected" | "sent_back";
  specialist?: Exclude<ChiefCommandSpecialist, "Chief">;
  category?: string;
  riskNote?: string;
}

export interface ChiefCommandWorkflowRef {
  id: string;
  title: string;
  stage: string;
  owner: string;
  summary: string;
  linkedTaskIds: string[];
}

export interface ChiefCommandRequestBody {
  prompt: string;
  source?: ChiefCommandSource;
  context?: {
    page?: string;
    section?: string;
  };
  liveContext: ChiefCommandLiveContext;
  knowledge: ChiefCommandKnowledgeLibrary;
  workflows?: ChiefCommandWorkflowRef[];
  approvals: ChiefCommandApprovalCandidate[];
}

export interface ChiefCommandResult {
  summary: string;
  blockers?: string[];
  recommendedAction: string;
  approvalNeeded?: boolean;
  approvalPrompt?: string;
  approvalTitle?: string;
  riskNote?: string;
  routedTo: ChiefCommandSpecialist;
  specialists?: ChiefCommandSpecialistContribution[];
  /** False when no deterministic branch matched (default / unmatched). */
  matched: boolean;
  resolution: ChiefCommandResolution;
  /** When set, approve → existing Research mission runners. */
  missionKind?: string;
  missionProjectId?: string;
  /**
   * Truth label for operator honesty.
   * executable | grounded | informational | stub
   */
  workTruth?: import("./workTruth.js").ChiefWorkTruth;
}

export type WorkflowForCommand = Pick<
  Workflow,
  "id" | "title" | "stage" | "owner" | "summary" | "linkedTaskIds"
>;
