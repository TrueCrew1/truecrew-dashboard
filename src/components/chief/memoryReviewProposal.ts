import {
  createApprovalCardFromChiefWorkflowRequest,
  type ChiefWorkflowApprovalRequest,
} from "./agentApprovalGates";
import { stableChiefId } from "./chiefMock";
import type { ApprovalCard, ApprovalProposal } from "./types";

/** Stable id so repeat runs dedupe while pending and the decision survives reload. */
export const MEMORY_REVIEW_PASS_ID = stableChiefId("apr-chief-memory-review", "memory-review-pass");

export type MemoryReviewEnqueueResult =
  | { outcome: "queued"; card: ApprovalCard }
  | { outcome: "blocked"; reason: "already_pending" };

/**
 * Memory Review Pass, per docs/AGENT_RUNBOOK.md § Memory Review Pass: Gate
 * "none" (internal knowledge maintenance), Owner Chief, Trigger "explicit
 * request from David only." The operator clicking the button in
 * ChiefHomePanel IS that explicit request — this doesn't add a timer or any
 * other automatic trigger. Recorded as a card purely so the run is visible
 * and decidable, same as Chief's other "Required outputs" logging.
 */
export function buildMemoryReviewPassRequest(
  approvals: ApprovalProposal[],
  createdAt: string = new Date().toISOString(),
): ChiefWorkflowApprovalRequest {
  const prOrRepoChangeCount = approvals.filter(
    (proposal) => proposal.source === "pr" || proposal.source === "repo_change",
  ).length;
  const pendingCount = approvals.filter((proposal) => proposal.status === "pending").length;

  return {
    id: MEMORY_REVIEW_PASS_ID,
    gate: "Second Brain — Memory Review Pass",
    workflowName: "Memory Review Pass",
    summary:
      `Memory Review Pass run at your explicit request from the Chief home panel, per ` +
      `docs/AGENT_RUNBOOK.md § Memory Review Pass. At run time: ${prOrRepoChangeCount} ` +
      `PR/repo-change card(s) and ${pendingCount} pending proposal(s) visible in this session's ` +
      `queue. This app has no live read access to knowledge/lessons/*.md or GitHub PRs (no new ` +
      `backend route added for either) — the actual page-by-page review and Lesson expiry check ` +
      `still happen in the Claude Code session that runs the real pass.`,
    riskLevel: "low",
    testsOrChecksDone: [
      {
        label: "Gate: none required for this workflow (AGENT_RUNBOOK § Memory Review Pass)",
        status: "pass",
      },
      {
        label: "Trigger is this explicit button click, not a timer or automatic heuristic",
        status: "pass",
      },
      {
        label: "Lesson expiry check (3-consecutive-pass rule) still runs in the real pass, unchanged",
        status: "pending",
      },
    ],
    requestedAction:
      "Approve to record this Memory Review Pass as run, or send back if it shouldn't have started now.",
    createdAt,
  };
}

export function hasPendingMemoryReviewPass(approvals: ApprovalProposal[]): boolean {
  return approvals.some(
    (proposal) => proposal.id === MEMORY_REVIEW_PASS_ID && proposal.status === "pending",
  );
}

/**
 * Runtime slice: enqueue Chief's Memory Review Pass card unless one is
 * already pending. Caller passes the shared approvals queue and
 * addCommandApproval from ChiefApprovalsContext — same single-queue path
 * every other agent's proposal uses.
 */
export function enqueueMemoryReviewPass(approvals: ApprovalProposal[]): MemoryReviewEnqueueResult {
  if (hasPendingMemoryReviewPass(approvals)) {
    return { outcome: "blocked", reason: "already_pending" };
  }

  const card = createApprovalCardFromChiefWorkflowRequest(buildMemoryReviewPassRequest(approvals));
  return { outcome: "queued", card };
}
