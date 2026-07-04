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
 * Build's request (BUILD_REQUEST_DUPLICATE_AUTH_FIX) and Planner's request
 * (PLANNER_REQUEST_START_PHASE_4, from the first real Weekly Planner Pass)
 * are real, grounded in verifiable repo state — not mocked. Research/Content
 * still use one illustrative example each (clearly marked EXAMPLE_*), not
 * live agent output yet. Extension point: replace each EXAMPLE_* constant
 * with a real request object once that agent's workflow actually produces
 * one, following the same pattern.
 */

export type AgentRole = "planner" | "build" | "research" | "content";

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
  build: [
    "Code change merging to main",
    "Database or schema migration",
    "Production-impacting refactor",
  ],
  research: [
    "New tool or stack adoption",
    "Vendor selection or contract decision",
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

export interface BuildApprovalRequest extends BaseAgentApprovalRequest {
  filesOrAreas: string[];
}

export interface ResearchApprovalRequest extends BaseAgentApprovalRequest {
  alternativesConsidered: string[];
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
  return baseCardFields(
    request,
    "Research",
    "research_agent",
    request.alternativesConsidered.length > 0
      ? `Alternatives considered: ${request.alternativesConsidered.join(", ")}.`
      : "No alternatives recorded.",
  );
}

export function createApprovalCardFromContentRequest(request: ContentApprovalRequest): ApprovalCard {
  return baseCardFields(request, "Content", "content_agent", `Audience: ${request.audience}.`);
}

// --- Requests: Build and Planner are real (below); Research/Content are illustrative examples ---

/**
 * Real, not illustrative — Weekly Planner Pass (2026-07-04):
 *
 * Chief Approvals Roadmap Phase 3 (Persistence & Audit Trail) was found fully
 * shipped during this pass — verified against live code, not assumed:
 * `chief_approval_decisions` table (migration `20260630000001_chief_approval_decisions.sql`),
 * `lib/supabase/queries.ts`, `api/chief/approvals/index.ts` (GET/POST + 409 on
 * already-decided), and `ChiefPanel.tsx` (hydrates on load, handles
 * `ChiefApprovalConflictError`) all match Phase 3's scope exactly. The roadmap
 * doc was the last place still marking it "Next" — corrected as a routine
 * refresh (Chief/Approvals Roadmap.md), no approval needed for that part.
 *
 * That makes Phase 4 (Alerts & Escalation) the genuine next open item — it
 * has a scope-lock ready but hasn't been started (`chiefApprovalUrgency.ts`
 * still has zero importers). Whether to actually start it now is a real
 * scope/sequencing decision, not a documentation fix — hence this card.
 */
export const PLANNER_REQUEST_START_PHASE_4: PlannerApprovalRequest = {
  id: "apr-planner-start-phase4",
  gate: APPROVAL_GATES.planner[1],
  summary:
    "Phase 3 (Persistence & Audit Trail) is confirmed shipped end-to-end — Phase 4 (Alerts & Escalation) is now the genuine next open item, not yet started. It has a ready scope-lock (wire the existing chiefApprovalUrgency.ts getUrgency() into ChiefBoard/ApprovalBoard for an overdue badge) but zero importers of that helper today.",
  riskLevel: "medium",
  testsOrChecksDone: [
    { label: "Confirmed Phase 3 fully shipped before proposing Phase 4 as next", status: "pass" },
    { label: "Confirmed chiefApprovalUrgency.ts still has zero importers (not started)", status: "pass" },
    { label: "Reconciliation with shipped stale-badge slice (different thresholds) flagged, not resolved", status: "pending" },
    { label: "Effort/capacity estimate for this slice", status: "pending" },
  ],
  requestedAction:
    "Approve starting Phase 4 now (wire getUrgency() into ChiefBoard/ApprovalBoard per the existing scope-lock), or hold and leave it queued. Alternative: reconcile chiefApprovalUrgency.ts's two-tier model with the shipped single-threshold stale badge first, before wiring anything in.",
  affectedPhases: ["Phase 4 — Alerts & Escalation"],
  createdAt: "2026-07-04T07:55:54.000Z",
};

/**
 * Real, not illustrative: two open PRs — #57 (build/auth-trim-fix) and #58
 * (fix/internal-auth-401) — carry a byte-for-byte identical diff to
 * lib/auth.ts, opened 8 minutes apart (2026-07-03T23:07:40Z and
 * 2026-07-03T23:15:32Z), both green on CI and mergeable against main.
 * Verified via `gh pr diff 57` / `gh pr diff 58` (empty `diff` between the
 * two) and `gh pr view` for CI status. Merging both would double-apply the
 * same fix; one needs to merge and the other needs to close.
 */
export const BUILD_REQUEST_DUPLICATE_AUTH_FIX: BuildApprovalRequest = {
  id: "apr-build-duplicate-auth-prs",
  gate: APPROVAL_GATES.build[0],
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

export const EXAMPLE_RESEARCH_REQUEST: ResearchApprovalRequest = {
  id: "apr-research-example-notification-vendor",
  gate: APPROVAL_GATES.research[1],
  summary:
    "Evaluate a transactional-email vendor for the notification hooks already stubbed in ChiefPanel.tsx (card created / card resolved), ahead of building that integration.",
  riskLevel: "medium",
  testsOrChecksDone: [
    { label: "Compared 2 vendors on pricing and delivery reliability", status: "pass" },
    { label: "Confirmed no PII leaves the app beyond what's already sent", status: "pending" },
  ],
  requestedAction: "Approve a vendor to unblock the notification-hook build, or hold for a wider survey.",
  alternativesConsidered: ["Resend", "Postmark"],
  createdAt: "2026-07-04T12:10:00.000Z",
};

export const EXAMPLE_CONTENT_REQUEST: ContentApprovalRequest = {
  id: "apr-content-example-homepage-hero",
  gate: APPROVAL_GATES.content[0],
  summary:
    'Draft homepage hero copy update describing the new Chief Approval Panel feature for prospective customers.',
  riskLevel: "low",
  testsOrChecksDone: [
    { label: "Reviewed against product tone guidance (industrial, plain, practical)", status: "pass" },
    { label: "No unverified feature claims beyond what's shipped", status: "pass" },
  ],
  requestedAction: "Approve copy for publish, or send back with edits.",
  audience: "public",
  createdAt: "2026-07-04T12:15:00.000Z",
};

export const AGENT_APPROVAL_CARDS: ApprovalCard[] = [
  createApprovalCardFromPlannerRequest(PLANNER_REQUEST_START_PHASE_4),
  createApprovalCardFromBuildRequest(BUILD_REQUEST_DUPLICATE_AUTH_FIX),
  createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_REQUEST),
  createApprovalCardFromContentRequest(EXAMPLE_CONTENT_REQUEST),
];
