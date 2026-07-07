import {
  BUILD_APPROVAL_GATES,
  createApprovalCardFromBuildRequest,
  type BuildApprovalRequest,
} from "./agentApprovalGates";
import { stableChiefId } from "./chiefMock";
import type { ApprovalCard, ApprovalProposal } from "./types";

export const BUILD_AGENT_TEST_DOC_PATH = "docs/build-agent-approval-test.md";

/** Stable id so repeat proposes dedupe while pending and decisions survive reload. */
export const BUILD_AGENT_TEST_PROPOSAL_ID = stableChiefId(
  "apr-build-test",
  BUILD_AGENT_TEST_DOC_PATH,
);

export type BuildAgentTestEnqueueResult =
  | { outcome: "queued"; card: ApprovalCard }
  | { outcome: "blocked"; reason: "already_pending" };

export function buildBuildAgentTestRequest(
  createdAt: string = new Date().toISOString(),
): BuildApprovalRequest {
  return {
    id: BUILD_AGENT_TEST_PROPOSAL_ID,
    gate: BUILD_APPROVAL_GATES[0],
    summary: `Build Agent proposes adding ${BUILD_AGENT_TEST_DOC_PATH} — a one-page note documenting the agent → Chief → operator approval loop for QA.`,
    riskLevel: "low",
    testsOrChecksDone: [
      { label: "Scoped to docs only — no production code paths", status: "pass" },
      { label: "npm run qa (lint + tsc + build)", status: "pass" },
      { label: "Operator review before merge to main", status: "pending" },
    ],
    requestedAction:
      "Approve to let Build Agent add the doc file, or reject to cancel this test proposal.",
    filesOrAreas: [BUILD_AGENT_TEST_DOC_PATH],
    createdAt,
  };
}

export function hasPendingBuildAgentTestProposal(approvals: ApprovalProposal[]): boolean {
  return approvals.some(
    (proposal) =>
      proposal.id === BUILD_AGENT_TEST_PROPOSAL_ID && proposal.status === "pending",
  );
}

/**
 * Runtime test slice: enqueue a Build Agent docs-only proposal unless one is
 * already pending. Caller passes the shared approvals queue and
 * addCommandApproval from ChiefApprovalsContext.
 */
export function enqueueBuildAgentTestProposal(
  approvals: ApprovalProposal[],
): BuildAgentTestEnqueueResult {
  if (hasPendingBuildAgentTestProposal(approvals)) {
    return { outcome: "blocked", reason: "already_pending" };
  }

  const card = createApprovalCardFromBuildRequest(buildBuildAgentTestRequest());
  return { outcome: "queued", card };
}
