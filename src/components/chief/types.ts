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

export type ApprovalChecklistStatus = "pass" | "fail" | "pending";

export interface ApprovalChecklistItem {
  label: string;
  status: ApprovalChecklistStatus;
}

export type ApprovalRecommendedDecision = "approve" | "hold" | "needs_changes";

/**
 * Where a proposal originated. Populated today: "ops_change" (live
 * operational signals, via deriveApprovalCandidates), "pr" (see
 * chiefApprovalCardMocks.ts, demo data only), and "repo_change" (see
 * repoChangeApprovals.ts — a real pending local repo change, not demo data).
 * "agent_build" is reserved, not yet wired to any source. Extension point:
 * add a real source (e.g. "github_pr" backed by the GitHub API, or
 * "agent_job" backed by a real agent job queue) as those integrations come
 * online.
 */
export type ApprovalSource = "pr" | "agent_build" | "ops_change" | "repo_change";

export interface ApprovalProposal {
  id: string;
  title: string;
  summary: string;
  recommendedAction: string;
  riskNote: string;
  status: ApprovalStatus;
  createdAt: string;
  updatedAt?: string;
  specialist?: Exclude<ChiefSpecialist, "Chief">;
  category?: ApprovalCategory;
  routeTo?: string;
  routeLabel?: string;
  decidedAt?: string;
  decidedBy?: Persona;
  /** Structured review checklist — optional; renders only when present. */
  checklist?: ApprovalChecklistItem[];
  /** Chief's suggested call, distinct from the operator's actual decision (`status`). */
  recommendedDecision?: ApprovalRecommendedDecision;
  source?: ApprovalSource;
}

/**
 * The "approval card" concept the Chief Approval Panel renders is the same
 * shape as ApprovalProposal — every proposal Chief routes to the operator IS
 * a card once it carries a checklist/recommendedDecision/source. Named
 * separately so call sites can express intent (e.g. `ApprovalCard[]` for a
 * list of fully-formed review cards) without a second parallel type.
 */
export type ApprovalCard = ApprovalProposal;

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
