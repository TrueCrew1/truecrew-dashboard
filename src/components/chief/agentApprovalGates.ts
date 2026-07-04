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
 * Build's request (BUILD_REQUEST_DUPLICATE_AUTH_FIX) and Content's request
 * (CONTENT_REQUEST_README_TAGLINE, from a real Weekly Content Tidy run) are
 * real, grounded in verifiable repo state — not mocked. Planner's real
 * request lands separately (see PR #72). Research still uses one
 * illustrative example (clearly marked EXAMPLE_*), not live agent output
 * yet. Extension point: replace it with a real request object once
 * Research's workflow actually produces one, following the same pattern.
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

/**
 * Real, not illustrative — Weekly Content Tidy, "no surprises" proof run
 * (2026-07-04):
 *
 * README.md's one-line description (line 3) reads "Premium desktop command
 * center for running business operations end-to-end." "Premium" is
 * marketing-flavored language that drifts from the plain/industrial tone
 * rule in CLAUDE.md ("no marketing fluff, no startup-generic phrasing").
 * This is public-facing — the first text anyone sees viewing this repo on
 * GitHub — so per the runbook's "External copy — no surprises" rule, it
 * gets its own single-issue card, never bundled with this same pass's
 * internal findings (terminology/link checks — see Build Log, all found
 * clean, nothing to bundle).
 */
export const CONTENT_REQUEST_README_TAGLINE: ContentApprovalRequest = {
  id: "apr-content-readme-tagline",
  gate: APPROVAL_GATES.content[0],
  summary:
    'README.md\'s top-line description reads "Premium desktop command center for running business operations end-to-end" — "Premium" is marketing-flavored language that drifts from the plain/industrial tone this project is meant to have. Proposed: "Desktop command center for running business operations."',
  riskLevel: "low",
  testsOrChecksDone: [
    { label: "Confirmed current README.md wording (line 3)", status: "pass" },
    { label: "Checked against CLAUDE.md's tone rule (industrial, plain, practical, no marketing fluff)", status: "pass" },
    { label: "Confirmed this is public-facing (first text shown on the repo's GitHub page)", status: "pass" },
  ],
  requestedAction: "Approve replacing the README tagline with the plain version, or send back with different wording.",
  audience: "public",
  createdAt: "2026-07-04T17:24:38.000Z",
};

export const AGENT_APPROVAL_CARDS: ApprovalCard[] = [
  createApprovalCardFromPlannerRequest(EXAMPLE_PLANNER_REQUEST),
  createApprovalCardFromBuildRequest(BUILD_REQUEST_DUPLICATE_AUTH_FIX),
  createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_REQUEST),
  createApprovalCardFromContentRequest(CONTENT_REQUEST_README_TAGLINE),
];
