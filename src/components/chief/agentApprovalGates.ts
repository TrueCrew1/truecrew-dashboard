import {
  getWorkflowById,
  summarizeWorkflowSteps,
  type WorkflowId,
} from "@/lib/research/researchGateway";
import {
  createSuggestedWorkflow,
  type ApprovalCard,
  type ApprovalChecklistItem,
  type ApprovalRecommendedDecision,
  type ApprovalSource,
  type SuggestedWorkflow,
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
  /**
   * Optional id of a playbook in the Research Workflow Library
   * (src/data/researchWorkflows.ts). Typed as `WorkflowId`, the closed union
   * of real playbook ids — not `string` — so this field can only ever name an
   * entry that actually exists in `RESEARCH_WORKFLOWS`; a typo or invented id
   * fails to compile instead of silently resolving to nothing. There is no
   * way to attach free-text workflow guidance through this field.
   *
   * When set, the card gains a `suggestedWorkflow` block that the Chief
   * Approvals panel renders as its own collapsed section, separate from
   * `riskNote`.
   *
   * Advisory only: attaching a workflow never runs a step, never changes the
   * recommended decision, and never gates the card. See
   * docs/AGENT_RUNBOOK.md -> "Research Workflow Library".
   */
  workflowId?: WorkflowId;
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
  const card = baseCardFields(
    request,
    "Research",
    "research_agent",
    request.alternativesConsidered.length > 0
      ? `Alternatives considered: ${request.alternativesConsidered.join(", ")}.`
      : "No alternatives recorded.",
  );

  const suggestedWorkflow = resolveSuggestedWorkflow(request.workflowId);
  return suggestedWorkflow === null ? card : { ...card, suggestedWorkflow };
}

/**
 * The attached playbook as a display shape, or `null` when no workflow is
 * attached or the id doesn't resolve — in which case the card is returned
 * untouched and renders exactly as it did before workflows existed.
 *
 * This is the one call site the rest of the app treats as "the" constructor
 * for a `SuggestedWorkflow`. The actual brand-stamping happens in
 * `createSuggestedWorkflow()` (types.ts) — the only function with access to
 * the private brand symbol, so it's the only place a value of this type can
 * be produced at all — but this is the only function that calls it, so in
 * practice a `SuggestedWorkflow` only ever comes from here. It never accepts
 * freeform text: the input is a `WorkflowId` (or `undefined`), and every
 * field of the result is read straight off a real `RESEARCH_WORKFLOWS` entry
 * through the gateway. The `getWorkflowById(workflowId) === null` branch
 * stays even though `workflowId` is already typed as `WorkflowId`: it is the
 * runtime backstop for the one case the type system cannot cover — a
 * `WorkflowId` that was valid when a request was authored but whose playbook
 * has since been removed from the store. The returned object is frozen so
 * nothing downstream can mutate a card's guidance after the fact.
 */
function resolveSuggestedWorkflow(workflowId: WorkflowId | undefined): SuggestedWorkflow | null {
  if (workflowId === undefined) return null;
  const workflow = getWorkflowById(workflowId);
  if (workflow === null) return null;

  return Object.freeze(
    createSuggestedWorkflow({
      id: workflow.id,
      title: workflow.title,
      steps: summarizeWorkflowSteps(workflow.id),
    }),
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

/**
 * Real, not illustrative: a Builder v1 slice adding
 * src/components/chief/chiefMock.test.ts, unit tests for the previously
 * untested stableChiefId() helper (used by buildApprovalFromResponse() to
 * derive deterministic approval-proposal ids). Test-only file, no production
 * code changed — same "Build proposes real, verifiable work" pattern as
 * BUILD_REQUEST_DUPLICATE_AUTH_FIX above, used here to give Builder v1 a
 * second real (not mocked) request to route through Chief.
 */
export const BUILD_REQUEST_CHIEF_MOCK_TEST_COVERAGE: BuildApprovalRequest = {
  id: "apr-build-chiefmock-test-coverage",
  gate: BUILD_APPROVAL_GATES[0],
  summary:
    "Add src/components/chief/chiefMock.test.ts — unit tests for stableChiefId() " +
    "(determinism, seed sensitivity, id format, prefix independence). No production code changed.",
  riskLevel: "low",
  testsOrChecksDone: [
    { label: "npm run test (new suite passes, no regressions in existing suites)", status: "pass" },
    { label: "npm run lint", status: "pass" },
    { label: "npm run build (tsc -b && vite build)", status: "pass" },
    { label: "Operator review before merge to main", status: "pending" },
  ],
  requestedAction: "Approve merging this test-only PR, or send back if broader coverage is wanted.",
  filesOrAreas: ["src/components/chief/chiefMock.test.ts"],
  createdAt: "2026-07-17T00:00:00.000Z",
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
 * Illustrative (EXAMPLE_*, same as the others in this file — not live agent
 * output) request showing how an agent attaches a Research Workflow Library
 * playbook to a request via `workflowId`. The attached workflow adds advisory
 * next-steps to the card's riskNote; it does not change the gate, the
 * recommended decision, or anything the operator must do.
 */
export const EXAMPLE_RESEARCH_DOC_DRIFT_REQUEST: ResearchApprovalRequest = {
  id: "apr-research-example-doc-drift",
  gate: APPROVAL_GATES.research[0],
  summary:
    "Reconcile docs/AGENT_RUNBOOK.md against real repo state before the next runbook edit — several sections describe paths and scripts that need verifying against what exists today.",
  riskLevel: "low",
  testsOrChecksDone: [
    { label: "Listed every file path the runbook names", status: "pass" },
    { label: "Confirmed each path exists in the repo today", status: "pending" },
  ],
  requestedAction:
    "Approve filing the reconciliation as a knowledge/sources/ note, or hold until the runbook's next scheduled edit.",
  alternativesConsidered: ["Fix drift ad hoc as it is noticed", "Full reconciliation pass now"],
  workflowId: "wf-doc-drift",
  createdAt: "2026-07-18T09:00:00.000Z",
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
  createApprovalCardFromBuildRequest(BUILD_REQUEST_CHIEF_MOCK_TEST_COVERAGE),
  createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_REQUEST),
  createApprovalCardFromResearchRequest(EXAMPLE_RESEARCH_DOC_DRIFT_REQUEST),
  createApprovalCardFromContentRequest(EXAMPLE_CONTENT_REQUEST),
];
