import type { Persona, TaskPriority } from "@/types";

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
 * chiefApprovalCardMocks.ts, demo data only), "repo_change" (see
 * repoChangeApprovals.ts — a real pending local repo change), the four
 * agent sources — "planner_agent" / "agent_build" / "research_agent" /
 * "content_agent" (see agentApprovalGates.ts — each agent's approval
 * requests mapped to cards; example/mock requests for now, same helper
 * pattern every agent must use) — and "chief_workflow" (Chief's own
 * internal, no-gate-required workflows, e.g. Memory Review Pass, per
 * docs/AGENT_RUNBOOK.md § Memory Review Pass — recorded as a card so the
 * run is visible/decidable, not because the workflow itself needs a gate).
 * Extension point: add a real source (e.g. "github_pr" backed by the
 * GitHub API) as that integration comes online.
 */
export type ApprovalSource =
  | "pr"
  | "agent_build"
  | "ops_change"
  | "repo_change"
  | "planner_agent"
  | "research_agent"
  | "content_agent"
  | "chief_workflow";

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
 *
 * Operating rule: this is the ONLY path to the operator's decision. No agent
 * (Planner, Build, Research, Content, or any future one) messages the
 * operator directly for approval — each builds its own request shape and
 * passes it through the matching `createApprovalCardFrom*Request()` helper
 * in `agentApprovalGates.ts`, which Chief renders here. See that file's
 * header and `docs/AGENT_WORKFLOW.md` for the full rule.
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
  /** Set by chiefDecisionTier.ts's classifier — see that file for the tier rules. Absent means classification wasn't run for this response. */
  decisionTier?: ChiefDecisionTier;
  /** Only present when decisionTier is "approve" — the structured escalation behind the card, not the card itself. */
  approvalPacket?: ChiefApprovalPacket;
}

/**
 * Chief's operating layer: before something becomes a full ApprovalCard,
 * Chief classifies it into one of three tiers (see chiefDecisionTier.ts,
 * the sole producer, for the deterministic rules):
 * - "decide"  — Chief can settle this itself; no operator action needed.
 * - "notify"  — the operator should know, but there's nothing to decide.
 * - "approve" — needs a real decision; Chief produces a ChiefApprovalPacket.
 * Read-only/stdout-only for now — this classifies and explains, it never
 * executes, writes, or triggers anything on its own.
 */
export type ChiefDecisionTier = "decide" | "notify" | "approve";

/** Same three-value risk scale used by agentApprovalGates.ts's AgentApprovalRiskLevel — kept as its own alias here to avoid a cross-file type dependency for one small union. */
export type ChiefRiskLevel = "low" | "medium" | "high";

/**
 * The structured escalation Chief produces when an item's tier is "approve".
 * Distinct from ApprovalCard (the operator-facing card shape rendered in the
 * Approvals tab) — this is the reasoning *behind* an escalation, produced
 * before (and independent of) however it eventually gets rendered as a card.
 */
export interface ChiefApprovalPacket {
  /** Plain-language recommended call, e.g. "Approve — low blast radius, easily reversible." */
  recommendation: string;
  riskLevel: ChiefRiskLevel;
  /** Why this was escalated rather than decided/notified. */
  rationale: string;
  /** Supporting facts Chief already gathered. */
  evidence: string[];
  /** Plain-language next step for the operator. */
  nextAction: string;
  /** What Chief already filtered, bundled, or discarded before escalating — so the operator isn't re-deriving Chief's own triage work. */
  improvementsMade: string[];
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
  /** Set on the single most-overdue open task promoted to the top of the at-risk lane. */
  needsAttention?: boolean;
}

export interface ChiefBoardLaneConfig {
  lane: ChiefBoardLane;
  label: string;
  emptyMessage: string;
}

export type AgentWorkStatus = "queued" | "active" | "blocked" | "awaiting_approval" | "completed";

/**
 * Agent names shown on the Agents tab. "Build Agent" isn't part of
 * ChiefSpecialist (that vocabulary attributes build-gate work to
 * "Workflow Gate Agent" instead) — it's added here, scoped to the
 * agent-work board only, so Build can have its own live-derived lane
 * without renaming/rippling ChiefSpecialist across approvals, routing,
 * and specialist-attribution call sites.
 */
export type AgentWorkAgentName = Exclude<ChiefSpecialist, "Chief"> | "Build Agent";

/**
 * A single unit of work an agent is carrying, shown on the Chief "Agents"
 * tab. Distinct from ApprovalProposal/ChiefBoardItem — this tracks an
 * agent's current task and status, not an operator decision or a live
 * dashboard signal. Mock data for most agents still (see
 * agentWorkBoardMock.ts); Build is the first real source — see
 * deriveBuildAgentWorkItems in chiefLiveContext.ts. Extension point: back
 * the remaining agents with real status once they report it somewhere.
 */
export interface AgentWorkItem {
  id: string;
  agent: AgentWorkAgentName;
  task: string;
  status: AgentWorkStatus;
  priority: TaskPriority;
  /** Short next-step (in-progress work) or blocker (why it's stuck) text. */
  note: string;
  updatedAt: string;
  /** Marks this item as derived from real app data rather than hand-written mock; omitted (mock) by default. */
  source?: "live" | "mock";
}

export interface AgentWorkStatusConfig {
  status: AgentWorkStatus;
  label: string;
  emptyMessage: string;
}
