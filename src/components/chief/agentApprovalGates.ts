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
  /** Optional override for the card title; defaults to "{Agent}: {gate}" when absent. */
  title?: string;
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
    title: request.title ?? `${titlePrefix}: ${request.gate}`,
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
 * Real, not illustrative — full analysis (2026-07-04):
 *
 * PR #57 (build/auth-trim-fix, opened 2026-07-03T23:07:40Z) and PR #58
 * (fix/internal-auth-401, opened 2026-07-03T23:15:32Z, 8 min later) carry a
 * byte-for-byte identical commit to lib/auth.ts — confirmed via
 * `diff <(gh pr diff 57) <(gh pr diff 58)` (empty output). Both trim
 * `INTERNAL_API_SECRET` and the `x-internal-key` header before the
 * timing-safe comparison in `requireInternalAuth()`, fixing false 401s
 * caused by a trailing newline a piped `echo` left in the rotated secret.
 * Both are green on CI and mergeable against main (verified via `gh pr
 * view`); neither has any human review or comment beyond the Vercel preview
 * bot (verified via `gh pr view --json comments,reviews`).
 *
 * PR #58's own body is more thorough: it names 4 additional affected routes
 * beyond #57's /api/health and /api/data (api/obsidian/notes.ts,
 * api/chief/approvals/index.ts, api/tasks/[id].ts, api/tasks/index.ts) and
 * explicitly documents having checked for other defects (header
 * name/case, env var names, no VERCEL_ENV/NODE_ENV-conditional bypass).
 * It also self-identifies as the duplicate needing reconciliation. On that
 * basis: recommend merging #58, closing #57 as superseded.
 *
 * Real blocker, not resolved: both PR bodies explicitly gate on "David
 * confirms Production secret rotation is complete" before merge — that
 * confirmation is not on record anywhere (no PR comment, no Build Log
 * entry), and lib/auth.ts on main still lacks the trim fix. This is a
 * genuine precondition, not a formality — recommending "hold" rather than
 * an unconditional "approve" so this doesn't get missed.
 */
export const BUILD_REQUEST_DUPLICATE_AUTH_FIX: BuildApprovalRequest = {
  id: "apr-build-duplicate-auth-prs",
  gate: APPROVAL_GATES.build[0],
  title: "Duplicate auth fixes — choose PR #57 or #58",
  summary:
    "PR #57 and PR #58 carry a byte-for-byte identical fix to lib/auth.ts (trim the secret and header before comparison, closing a false-401 from a rotated secret's trailing newline). PR #58's write-up is more thorough (names 4 more affected routes, verifies no other defect) and already self-flags as the duplicate — recommend merging #58, closing #57. Neither should merge until Production secret rotation is confirmed; that confirmation is not yet on record.",
  riskLevel: "medium",
  testsOrChecksDone: [
    { label: "Both PRs inspected (diff, metadata, comments)", status: "pass" },
    { label: "Diffs confirmed byte-for-byte identical (lib/auth.ts, +2/-2 each)", status: "pass" },
    { label: "CI/build status for each PR (both green, mergeable)", status: "pass" },
    { label: "Behavior/risk differences identified (none in code; #58's write-up is more thorough)", status: "pass" },
    { label: "Recommended PR to merge: #58", status: "pass" },
    { label: "Recommended PR to close: #57 (superseded duplicate)", status: "pass" },
    {
      label:
        "Confirm INTERNAL_API_SECRET rotation — only David can check this (Vercel env value, redeploy, /api/health 200)",
      status: "pending",
    },
  ],
  requestedAction:
    "Approve once secret rotation is confirmed: merge PR #58, then close PR #57 with a comment noting it's superseded by #58. Do not merge either before rotation is confirmed.",
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
  createApprovalCardFromPlannerRequest(EXAMPLE_PLANNER_REQUEST),
  createApprovalCardFromBuildRequest(BUILD_REQUEST_DUPLICATE_AUTH_FIX),
  createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_REQUEST),
  createApprovalCardFromContentRequest(EXAMPLE_CONTENT_REQUEST),
];
