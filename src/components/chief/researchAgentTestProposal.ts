import {
  APPROVAL_GATES,
  createApprovalCardFromResearchRequest,
  type ResearchApprovalRequest,
} from "./agentApprovalGates";
import { stableChiefId } from "./chiefMock";
import type { ApprovalCard, ApprovalProposal } from "./types";

export const RESEARCH_AGENT_TEST_DOC_PATH = "docs/research-agent-approval-test.md";

/** Stable id so repeat proposes dedupe while pending and decisions survive reload. */
export const RESEARCH_AGENT_TEST_PROPOSAL_ID = stableChiefId(
  "apr-research-test",
  RESEARCH_AGENT_TEST_DOC_PATH,
);

export type ResearchAgentTestEnqueueResult =
  | { outcome: "queued"; card: ApprovalCard }
  | { outcome: "blocked"; reason: "already_pending" };

export function buildResearchAgentTestRequest(
  createdAt: string = new Date().toISOString(),
): ResearchApprovalRequest {
  return {
    id: RESEARCH_AGENT_TEST_PROPOSAL_ID,
    // No Research gate describes a docs-only QA path; reuse the stack-adoption
    // gate structurally — copy below states this is not a real adoption ask.
    gate: APPROVAL_GATES.research[0],
    summary: `QA test only — not a real tool adoption. Research Agent proposes adding ${RESEARCH_AGENT_TEST_DOC_PATH}, a docs-only note for end-to-end approval QA. No stack change, vendor pick, or production impact.`,
    riskLevel: "low",
    testsOrChecksDone: [
      { label: "QA test only — not a real tool or stack adoption recommendation", status: "pass" },
      { label: "Scoped to docs only — no production code paths", status: "pass" },
      { label: "Operator review before any doc is added", status: "pending" },
    ],
    requestedAction:
      "Approve this QA test proposal to record the operator decision, or reject to cancel. No investigation or doc file is created by this approval alone.",
    alternativesConsidered: ["Skip — this is not a real adoption decision"],
    createdAt,
  };
}

export function hasPendingResearchAgentTestProposal(approvals: ApprovalProposal[]): boolean {
  return approvals.some(
    (proposal) =>
      proposal.id === RESEARCH_AGENT_TEST_PROPOSAL_ID && proposal.status === "pending",
  );
}

/**
 * Runtime test slice: enqueue a Research Agent docs-only QA proposal unless one
 * is already pending. Caller passes the shared approvals queue and
 * addCommandApproval from ChiefApprovalsContext.
 */
export function enqueueResearchAgentTestProposal(
  approvals: ApprovalProposal[],
): ResearchAgentTestEnqueueResult {
  if (hasPendingResearchAgentTestProposal(approvals)) {
    return { outcome: "blocked", reason: "already_pending" };
  }

  const card = createApprovalCardFromResearchRequest(buildResearchAgentTestRequest());
  return { outcome: "queued", card };
}
