import type { Persona } from "@/types";

export type ChiefSpecialist =
  | "Workflow Gate Agent"
  | "Librarian Agent"
  | "Research Agent"
  | "Roadmap Agent"
  | "Marketer Agent"
  | "Chief";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "sent_back";

export type ApprovalAction = Exclude<ApprovalStatus, "pending">;

export interface ApprovalDecision {
  proposalId: string;
  status: ApprovalAction;
  decidedAt: string;
  actor: Persona | null;
}

export type ApprovalCategory =
  | "gate_override"
  | "incident_repair"
  | "deploy_release"
  | "onboarding"
  | "customer_link"
  | "workflow_link"
  | "focus_escalation"
  | "overdue_review"
  | "alert_action";

export type CommandHistoryStatus = "completed" | "pending" | "failed";

export interface SpecialistContribution {
  specialist: Exclude<ChiefSpecialist, "Chief">;
  contribution: string;
}

export interface ApprovalProposal {
  id: string;
  title: string;
  summary: string;
  recommendedAction: string;
  riskNote: string;
  status: ApprovalStatus;
  createdAt: string;
  specialist?: Exclude<ChiefSpecialist, "Chief">;
  category?: ApprovalCategory;
  routeTo?: string;
  routeLabel?: string;
  decidedAt?: string;
  decidedBy?: Persona;
}

export interface CommandHistoryEntry {
  id: string;
  command: string;
  timestamp: string;
  resultSummary: string;
  status: CommandHistoryStatus;
}

export interface ChiefResponse {
  summary: string;
  blockers?: string[];
  recommendedAction: string;
  approvalNeeded?: boolean;
  approvalPrompt?: string;
  approvalTitle?: string;
  riskNote?: string;
  routedTo: ChiefSpecialist;
  specialists?: SpecialistContribution[];
}

export type ChiefBoardLane = "at_risk" | "blocked" | "missing_context" | "approval";

export type ChiefBoardTone = "neutral" | "warn" | "critical";

export interface ChiefBoardItem {
  id: string;
  lane: ChiefBoardLane;
  title: string;
  detail: string;
  routeTo: string;
  routeLabel: string;
  meta?: string;
  tone: ChiefBoardTone;
  timestamp?: string;
  /** Set on approval-lane rows so board actions target the underlying proposal. */
  proposalId?: string;
}

export interface ChiefBoardLaneConfig {
  lane: ChiefBoardLane;
  label: string;
  emptyMessage: string;
}
