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
 * Build's request (BUILD_REQUEST_DUPLICATE_AUTH_FIX below) is a real one,
 * grounded in verifiable repo state — not mocked. Planner/Research/Content
 * still use one illustrative example each (clearly marked EXAMPLE_*), not
 * live agent output yet. Extension point: replace each EXAMPLE_* constant
 * with a real request object once that agent's workflow actually produces
 * one, following the same pattern as Build's.
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

// --- Requests: Build is real (below); Planner/Research/Content are illustrative examples ---

export const EXAMPLE_PLANNER_REQUEST: PlannerApprovalRequest = {
  id: "apr-planner-example-phase4",
  gate: APPROVAL_GATES.planner[1],
  summary:
    "Propose starting Chief Approvals Roadmap Phase 4 (Alerts & Escalation) — urgency buckets and inline tags on pending approvals.",
  riskLevel: "medium",
  testsOrChecksDone: [
    { label: "Reviewed against reserved chiefApprovalUrgency.ts helper", status: "pass" },
    { label: "Scoped against shipped stale-badge slice to avoid overlap", status: "pass" },
    { label: "Effort estimate for scheduling", status: "pending" },
  ],
  requestedAction: "Approve starting Phase 4 planning, or hold until Phase 3 (Persistence) ships.",
  affectedPhases: ["Phase 4 — Alerts & Escalation"],
  createdAt: "2026-07-04T12:00:00.000Z",
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

/**
 * Real, not illustrative — follow-up from the Build ↔ Vercel status check
 * (2026-07-04): 43 "INTERNAL_API_SECRET is not configured" runtime errors
 * over 7 days (19 users) traced to PR #59's Preview deployment, not
 * production — production deploys from PR #66/#67/#68 show zero
 * corresponding errors. Likely cause: the secret is scoped to Production
 * only in Vercel's env var settings, so every Preview build's `/api/*`
 * routes fail auth by design, not by accident.
 *
 * Precondition checked before opening this card: PR #57 is now closed
 * (confirmed via `gh pr view 57` — state CLOSED) and PR #58 remains open/
 * held (state OPEN, mergeable, CI green) — a valid "resolved" state per
 * this decision's own framing, since #58 being held rather than merged
 * doesn't change anything about Preview-scope behavior either way. This
 * card is scoped strictly to Preview secret access, not to #57/#58's
 * trim-fix/rotation question.
 *
 * Recommendation basis: this repo's own established testing practice uses
 * mock mode (`isLiveApiEnabled() === false`) for all local/preview
 * verification — every browser check in this entire session used the
 * mock-mode dev server, never a live-API preview deployment. There's no
 * demonstrated need for Preview builds to hit authenticated live routes.
 * Adding a production secret to every Preview deployment (spun up from any
 * branch, including exploratory ones) would expand secret exposure for no
 * proven benefit — the safer, least-privilege default is to leave Preview
 * unauthenticated and document why, so future Build Health Checks don't
 * re-flag the same expected errors as a new finding.
 */
export const BUILD_REQUEST_VERCEL_PREVIEW_SECRET_SCOPE: BuildApprovalRequest = {
  id: "apr-build-vercel-preview-secret-scope",
  // Note: this matches the runbook's documented Build gate "Any work
  // affecting security/auth or external APIs" — not yet a 4th indexed
  // entry in APPROVAL_GATES.build below (still 3 items on main as of this
  // card); using the literal string rather than an out-of-bounds index.
  gate: "Any work affecting security/auth or external APIs",
  summary:
    "43 preview-only auth rejections (19 users) on PR #59's Vercel deployment over the last 7 days — production is clean (PR #66/#67/#68 deploys show zero corresponding errors). Likely cause: INTERNAL_API_SECRET is scoped to Production only in Vercel, so Preview builds' /api/* routes reject by design. This is a small, non-emergency, preview-only decision — no production impact either way.",
  riskLevel: "low",
  testsOrChecksDone: [
    { label: "Confirmed 43 errors trace to PR #59's Preview deployment, not production", status: "pass" },
    { label: "Confirmed zero corresponding errors on recent production deploys (PR #66/#67/#68)", status: "pass" },
    { label: "Confirmed this repo's established testing practice uses mock mode, not live-API preview access", status: "pass" },
    { label: "Direct read of Vercel env-var Preview/Production scoping (names only, not values)", status: "pending" },
  ],
  requestedAction:
    "Choose one: (a) add INTERNAL_API_SECRET to Preview scope in Vercel so previews behave like production; (b) leave as-is, no runbook change; (c) leave as-is AND document in the runbook that these preview auth errors are expected/known noise, not an incident. Recommend (c) — least-privilege (don't expand secret exposure to every preview branch without a proven need) plus prevents future Build Health Checks from re-flagging the same expected errors as new.",
  filesOrAreas: ["Vercel project env vars (Preview scope)", "docs/AGENT_RUNBOOK.md (if (c) is chosen)"],
  createdAt: "2026-07-04T18:05:18.000Z",
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
  createApprovalCardFromPlannerRequest(EXAMPLE_PLANNER_REQUEST),
  createApprovalCardFromBuildRequest(BUILD_REQUEST_DUPLICATE_AUTH_FIX),
  createApprovalCardFromBuildRequest(BUILD_REQUEST_VERCEL_PREVIEW_SECRET_SCOPE),
  createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_REQUEST),
  createApprovalCardFromContentRequest(EXAMPLE_CONTENT_REQUEST),
];
