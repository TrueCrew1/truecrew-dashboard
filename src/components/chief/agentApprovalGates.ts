import type {
  ApprovalCard,
  ApprovalChecklistItem,
  ApprovalRecommendedDecision,
  ApprovalSource,
} from "./types";

/**
 * OPERATING RULE — read before wiring any agent into this file:
 *
 * Planner, Build, Research, and Content agents must NEVER ask the operator
 * for approval directly (no direct messages, no side-channel asks). Each
 * agent builds its own *ApprovalRequest object and passes it through the
 * matching createApprovalCardFrom*Request() helper below. Chief is the only
 * thing that turns a request into an ApprovalCard, and the Chief Approval
 * Panel (ChiefPanel.tsx -> ApprovalBoard.tsx) is the only surface the
 * operator sees approvals on. See docs/AGENT_WORKFLOW.md for the repo-level
 * statement of this rule.
 *
 * No illustrative EXAMPLE_* or stale static seed cards are shown in Approvals.
 * Wire a real request through createApprovalCardFrom* when an agent produces
 * one. Planner overdue re-sequencing is live (plannerReprioritizationProposal.ts).
 * Research start cards come from the live/session research queue.
 */

export type AgentRole = "planner" | "build" | "research" | "content";

/**
 * Build-specific approval gates, typed so `BuildApprovalRequest.gate` can't
 * drift from this canonical list (Planner/Research/Content gates stay plain
 * strings for now — Build is the one agent with a real, wired request, so
 * it's the one worth the extra type safety).
 */
export type BuildApprovalGate =
  | "Code change merging to main"
  | "Database or schema migration"
  | "Production-impacting refactor"
  | "Changes to approval-related UX or logic";

export const BUILD_APPROVAL_GATES: readonly BuildApprovalGate[] = [
  "Code change merging to main",
  "Database or schema migration",
  "Production-impacting refactor",
  "Changes to approval-related UX or logic",
];

/**
 * Which agent actions require an ApprovalCard before proceeding. Anything
 * NOT listed here is routine enough for the agent to just do — anything
 * listed here must go through Chief first.
 */
export const APPROVAL_GATES: Record<AgentRole, readonly string[]> = {
  planner: [
    "Scope change affecting more than one phase",
    "New roadmap phase",
    "Roadmap reprioritization or re-sequencing",
  ],
  build: BUILD_APPROVAL_GATES,
  research: [
    "New tool or stack adoption",
    "Vendor selection or contract decision",
    "Project summary and build handoff",
    "Monitor incident postmortem",
  ],
  content: [
    "External-facing copy shipped to clients or the public",
    "Public-facing layout or design change",
  ],
};

export type AgentApprovalRiskLevel = "low" | "medium" | "high";

const RISK_TO_RECOMMENDATION: Record<AgentApprovalRiskLevel, ApprovalRecommendedDecision> = {
  low: "approve",
  medium: "hold",
  high: "needs_changes",
};

interface BaseAgentApprovalRequest {
  id: string;
  /** Must be one of this agent's APPROVAL_GATES entries. */
  gate: string;
  summary: string;
  riskLevel: AgentApprovalRiskLevel;
  testsOrChecksDone: ApprovalChecklistItem[];
  requestedAction: string;
  createdAt: string;
}

export interface PlannerApprovalRequest extends BaseAgentApprovalRequest {
  affectedPhases: string[];
}

export interface BuildApprovalRequest extends Omit<BaseAgentApprovalRequest, "gate"> {
  gate: BuildApprovalGate;
  filesOrAreas: string[];
}

export interface ResearchApprovalRequest extends BaseAgentApprovalRequest {
  alternativesConsidered: string[];
  /** Executable mission kind when approval should trigger a governed runner. */
  missionKind?: string;
  /** Workflow/project id the mission should load from Supabase. */
  missionProjectId?: string;
}

export interface ContentApprovalRequest extends BaseAgentApprovalRequest {
  audience: "client" | "public";
}

function baseCardFields(
  request: BaseAgentApprovalRequest,
  titlePrefix: string,
  source: ApprovalSource,
  extraRiskNote: string,
): ApprovalCard {
  return {
    id: request.id,
    title: `${titlePrefix}: ${request.gate}`,
    summary: request.summary,
    recommendedAction: request.requestedAction,
    riskNote: `Risk level: ${request.riskLevel}. ${extraRiskNote}`,
    status: "pending",
    createdAt: request.createdAt,
    source,
    recommendedDecision: RISK_TO_RECOMMENDATION[request.riskLevel],
    checklist: request.testsOrChecksDone,
  };
}

export function createApprovalCardFromPlannerRequest(request: PlannerApprovalRequest): ApprovalCard {
  return baseCardFields(
    request,
    "Planner",
    "planner_agent",
    `Affects: ${request.affectedPhases.join(", ")}.`,
  );
}

export function createApprovalCardFromBuildRequest(request: BuildApprovalRequest): ApprovalCard {
  return baseCardFields(
    request,
    "Build",
    "agent_build",
    `Touches: ${request.filesOrAreas.join(", ")}.`,
  );
}

export function createApprovalCardFromResearchRequest(
  request: ResearchApprovalRequest,
): ApprovalCard {
  return {
    ...baseCardFields(
      request,
      "Research",
      "research_agent",
      request.alternativesConsidered.length > 0
        ? `Alternatives considered: ${request.alternativesConsidered.join(", ")}.`
        : "No alternatives recorded.",
    ),
    missionKind: request.missionKind,
    missionProjectId: request.missionProjectId,
  };
}

export function createApprovalCardFromContentRequest(request: ContentApprovalRequest): ApprovalCard {
  return baseCardFields(request, "Content", "content_agent", `Audience: ${request.audience}.`);
}

// --- Historical request fixtures (not seeded into Approvals) ---
// Planner's live overdue re-sequencing signal lives in plannerReprioritizationProposal.ts.
// Keep BUILD_REQUEST_DUPLICATE_AUTH_FIX for knowledge/decision cross-refs; do not re-seed.

/**
 * Historical fixture for PRs #57/#58 duplicate auth fix (July 2026).
 * Not shown in Approvals — kept for knowledge/decisions cross-references.
 */
export const BUILD_REQUEST_DUPLICATE_AUTH_FIX: BuildApprovalRequest = {
  id: "apr-build-duplicate-auth-prs",
  gate: BUILD_APPROVAL_GATES[0],
  summary:
    "PR #57 (build/auth-trim-fix) and PR #58 (fix/internal-auth-401) both trim the internal API secret/header before comparison in lib/auth.ts — identical diffs, opened 8 minutes apart. Both are green on CI and mergeable.",
  riskLevel: "low",
  testsOrChecksDone: [
    { label: "Confirmed diffs are byte-for-byte identical (lib/auth.ts, +2/-2 each)", status: "pass" },
    { label: "Both PRs green on CI and mergeable against main", status: "pass" },
  ],
  requestedAction: "Approve merging PR #58 and closing #57 as a duplicate (or vice versa).",
  filesOrAreas: ["lib/auth.ts"],
  createdAt: "2026-07-04T07:20:01.000Z",
};

/** Empty seed list — Approvals no longer shows illustrative agent example cards. */
export const AGENT_APPROVAL_CARDS: ApprovalCard[] = [];
