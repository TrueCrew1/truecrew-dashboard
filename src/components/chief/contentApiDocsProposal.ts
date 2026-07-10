import {
  APPROVAL_GATES,
  createApprovalCardFromContentRequest,
  type ContentApprovalRequest,
} from "./agentApprovalGates";
import { stableChiefId } from "./chiefMock";
import type { ApprovalCard, ApprovalProposal } from "./types";

/**
 * Content signal — real, not illustrative.
 *
 * Source: `isLiveApiEnabled()` (exposed here as `liveApi` — the same flag
 * `DataContext`, `ChiefApprovalsContext`, and `SettingsPage` already read to
 * decide whether the app talks to real Supabase-backed API routes).
 *
 * Verified fact (read directly from the repo, not guessed): README.md's
 * "API routes" table lists six routes (health, data, tasks, obsidian/notes,
 * librarian/artifacts, tasks/:id/artifacts) but omits `/api/chief/approvals`
 * — the route `lib/api/client.ts`'s `fetchChiefApprovalDecisions()` and
 * `recordChiefApprovalDecision()` genuinely call (wired into
 * `ChiefApprovalsContext.tsx`'s decision-hydration effect and
 * `recordDecision()`) whenever live API mode is on.
 *
 * README is public-facing — the first thing shown on this repo's GitHub page
 * — so an incomplete route list there is exactly Content's "no unverified
 * feature claims" / "no surprises" concern (docs/AGENT_RUNBOOK.md § Content
 * Agent, § External copy — no surprises). The signal only fires while live
 * API mode is actually active: that's when `/api/chief/approvals` is real
 * production traffic (approval decisions actually persisting to Supabase),
 * not a mock-mode no-op, so the doc gap is materially misleading right now,
 * not hypothetical.
 *
 * Content never edits README itself here — it only builds a
 * ContentApprovalRequest and routes it through the existing shared path:
 * createApprovalCardFromContentRequest() -> addCommandApproval() -> Chief's
 * approval queue, same as Build/Planner/Research's real requests. No new
 * approval surface, route, queue, or schema.
 */

/** Stable id so repeat proposes dedupe while one is pending. */
export const CONTENT_API_DOCS_PROPOSAL_ID = stableChiefId(
  "apr-content-api-docs",
  "readme-missing-chief-approvals-route",
);

export type ContentApiDocsResult =
  | { outcome: "queued"; card: ApprovalCard }
  | { outcome: "blocked"; reason: "already_pending" }
  | { outcome: "no_signal" };

export function buildContentApiDocsRequest(
  createdAt: string = new Date().toISOString(),
): ContentApprovalRequest {
  return {
    id: CONTENT_API_DOCS_PROPOSAL_ID,
    gate: APPROVAL_GATES.content[0],
    summary:
      'README.md\'s "API routes" table (public — the first thing shown on this repo\'s GitHub ' +
      "page) lists 6 routes but omits GET/POST /api/chief/approvals, the route " +
      "lib/api/client.ts's fetchChiefApprovalDecisions()/recordChiefApprovalDecision() actually " +
      "call for Chief approval decision persistence — and live API mode is active right now, so " +
      "that route is real production traffic, not a hypothetical one. Proposed: add a " +
      '"GET/POST /api/chief/approvals — Chief approval decisions" row to the table.',
    riskLevel: "low",
    testsOrChecksDone: [
      {
        label: "Confirmed README.md's API routes table omits /api/chief/approvals",
        status: "pass",
      },
      {
        label:
          "Confirmed lib/api/client.ts genuinely calls /api/chief/approvals (fetch + record decision)",
        status: "pass",
      },
      { label: "Confirmed live API mode is active right now, not hypothetical", status: "pass" },
    ],
    requestedAction:
      "Approve adding the missing /api/chief/approvals row to README's API routes table, or " +
      "send back if the route should stay undocumented.",
    audience: "public",
    createdAt,
  };
}

export function hasPendingContentApiDocsProposal(approvals: ApprovalProposal[]): boolean {
  return approvals.some(
    (proposal) => proposal.id === CONTENT_API_DOCS_PROPOSAL_ID && proposal.status === "pending",
  );
}

/**
 * Runtime signal slice: propose the README API-docs fix when live API mode is
 * actually on. Returns `no_signal` (no card) in mock mode — truthful, never a
 * placeholder card. Caller passes the live-API flag plus the shared approvals
 * queue and addCommandApproval from ChiefApprovalsContext.
 */
export function proposeContentApiDocsFix(
  liveApi: boolean,
  approvals: ApprovalProposal[],
): ContentApiDocsResult {
  if (!liveApi) {
    return { outcome: "no_signal" };
  }
  if (hasPendingContentApiDocsProposal(approvals)) {
    return { outcome: "blocked", reason: "already_pending" };
  }

  const card = createApprovalCardFromContentRequest(buildContentApiDocsRequest());
  return { outcome: "queued", card };
}
