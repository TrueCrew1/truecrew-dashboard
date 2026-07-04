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
 * Real, not illustrative — Daily Build Health Check stress test (2026-07-04):
 *
 * PR #61 (branch claude/chief-approval-alerts-8jmzqu, a different session's
 * work, CONFLICTING against main) already implements Phase 4 (Alerts &
 * Escalation): a real ApprovalAlertsPanel on Monitor wired to
 * chiefApprovalUrgency.ts's getUrgency()/DUE_SOON_HOURS/OVERDUE_HOURS.
 * Planner's PLANNER_REQUEST_START_PHASE_4 (PR #72) asks "should we start
 * Phase 4?" on the premise that it hasn't started — but it has, in a
 * conflicting, unmerged PR neither Planner nor this session knew about
 * until this scan. High impact: it directly changes what PR #72 is even
 * asking. Kept as its own card, not bundled with the lower-stakes stale-PR
 * cleanup below — this is a distinct, higher-priority decision.
 */
export const BUILD_REQUEST_PHASE4_PR_CONFLICT: BuildApprovalRequest = {
  id: "apr-build-pr61-phase4-conflict",
  gate: APPROVAL_GATES.build[0],
  summary:
    "PR #61 already implements Phase 4 (Alerts & Escalation) — a real ApprovalAlertsPanel wired to the existing getUrgency() thresholds — but is unmerged and conflicting. This directly overlaps with Planner's pending 'should we start Phase 4?' card (PR #72), which assumed Phase 4 hadn't started yet.",
  riskLevel: "medium",
  testsOrChecksDone: [
    { label: "Confirmed PR #61's real diff (ApprovalAlertsPanel.tsx, useApprovalAlerts.ts, approvalAlerts.ts, MonitorPage.tsx wiring)", status: "pass" },
    { label: "Confirmed PR #61 is CONFLICTING against current main", status: "pass" },
    { label: "Cross-checked against Planner's PR #72 — direct overlap confirmed, not assumed", status: "pass" },
    { label: "Reconciliation plan (rebase #61 vs. fold into #72's decision)", status: "pending" },
  ],
  requestedAction:
    "Resolve before deciding PR #72: either treat PR #61 as the real Phase 4 start (review/rebase it) and consider #72 answered, or hold both until you pick a path.",
  filesOrAreas: [
    "src/components/chief/ApprovalAlertsPanel.tsx",
    "src/components/chief/useApprovalAlerts.ts",
    "src/pages/MonitorPage.tsx",
    "(cross-references PR #72)",
  ],
  createdAt: "2026-07-04T17:09:01.000Z",
};

/**
 * Real, not illustrative — Daily Build Health Check stress test (2026-07-04):
 *
 * Bundled batch of 13 stale/superseded open PRs from 2026-06-28/29 (6+ days
 * old), all sharing one decision ("close as superseded"), found via
 * `gh pr list --state open` plus cross-checks: #29/#32 and #38/#39 are
 * confirmed exact duplicates (identical file sets via `gh pr diff --name-only`,
 * same pattern as PR #57/#58); the Obsidian-notes PRs (#34/#36/#37/#42/#43)
 * are superseded because that feature is already wired on main independently
 * (KnowledgePage.tsx calls fetchObsidianNotes() today); the Today/Operations
 * polish PRs (#23/#24/#25/#26/#27/#28/#30/#33) are superseded because their
 * underlying features (signal clarity, customer visibility, workflow gates)
 * are confirmed closed via different commits per the Current Priority List.
 * One card, one checklist item per cluster — not 13 separate cards.
 *
 * NOT included here (deferred instead — see Build Log): PR #46/#47 (local-dev
 * /api/* serving — checked vite.config.ts, no existing fix found, so NOT
 * confirmed superseded) and PR #56 (Vercel Speed Insights — unrelated theme,
 * just stale, no conflict either way). These don't share this bundle's
 * confident "close as superseded" recommendation, so bundling them in would
 * misrepresent the analysis — deferred to the next Chief Weekly Digest queue
 * instead of forced into this card or given their own cards past the cap.
 *
 * RESOLVED (2026-07-04): approved in full via the Chief → Approvals bundled-
 * card walkthrough. All 15 PRs closed on GitHub with an explanatory comment
 * each (#23,24,25,26,27,28,30,33,34,36,37,42,43 as superseded; #29 and #38
 * as duplicates, keeping #32 and #39 per the default). See Build Log for
 * the full outcome. Removed from AGENT_APPROVAL_CARDS below — kept here,
 * not deleted, as the record of what was decided and why.
 */
export const BUILD_REQUEST_STALE_PR_CLEANUP: BuildApprovalRequest = {
  id: "apr-build-stale-pr-cleanup-batch",
  gate: APPROVAL_GATES.build[0],
  summary:
    "13 open PRs from 2026-06-28/29 appear superseded by shipped work or are exact duplicates of each other — bundled as one batch-close decision rather than 13 separate cards.",
  riskLevel: "low",
  testsOrChecksDone: [
    { label: "#29 / #32 confirmed exact duplicates (identical file sets)", status: "pass" },
    { label: "#38 / #39 confirmed exact duplicates (identical file sets)", status: "pass" },
    { label: "#34 / #36 / #37 / #42 / #43 (Obsidian notes) confirmed superseded — feature already wired on main independently", status: "pass" },
    { label: "#23 / #24 / #25 / #26 / #27 / #28 / #30 / #33 (Today/Operations polish) confirmed superseded per Current Priority List closures", status: "pass" },
  ],
  requestedAction:
    "Approve closing all 13 as superseded/duplicate: #23, #24, #25, #26, #27, #28, #30, #33 (Today/Operations polish), #34, #36, #37, #42, #43 (Obsidian notes), plus one of #29/#32 and one of #38/#39 as duplicates (keep whichever you prefer, close the other).",
  filesOrAreas: ["13 open PRs — see checklist for cluster breakdown"],
  createdAt: "2026-07-04T17:09:01.000Z",
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
  createApprovalCardFromBuildRequest(BUILD_REQUEST_PHASE4_PR_CONFLICT),
  // BUILD_REQUEST_STALE_PR_CLEANUP intentionally omitted — resolved (see its
  // comment above and the Build Log); no longer pending.
  createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_REQUEST),
  createApprovalCardFromContentRequest(EXAMPLE_CONTENT_REQUEST),
];
