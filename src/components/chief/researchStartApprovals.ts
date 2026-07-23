/**
 * Approval → research start bridge (derivation half).
 *
 * One pending approval card per QUEUED research request, so approving on the
 * board is the single action that releases a topic to the research runner.
 * Pure derivation: card ids are deterministic (`apr-research-start-<request id>`)
 * so recorded decisions survive reloads and re-derives, and cards disappear on
 * their own once the request leaves `queued` — no cleanup state to manage.
 *
 * The transition half (approved → in_progress) lives in ChiefApprovalsContext's
 * recordDecision, keyed off `proposal.researchRequestId`. Approval only moves
 * the queue row; it never executes research — see docs/RESEARCH_RUNNER.md.
 */
import type { ResearchRequest } from "@/lib/research/types";
import type { ApprovalProposal } from "./types";

export const RESEARCH_START_APPROVAL_ID_PREFIX = "apr-research-start-";

export function researchStartApprovalId(requestId: string): string {
  return `${RESEARCH_START_APPROVAL_ID_PREFIX}${requestId}`;
}

export function deriveResearchStartApprovals(requests: ResearchRequest[]): ApprovalProposal[] {
  return requests
    .filter((request) => request.status === "queued")
    .map((request) => ({
      id: researchStartApprovalId(request.id),
      title: `Start research: ${request.topic}`,
      summary: request.whyItMatters,
      recommendedAction:
        "Approve to move this request to in progress — the research runner (or you) picks it up from there. Reject to leave it queued.",
      riskNote:
        `Approval only sets the queue row to in progress; nothing executes on approval itself. Expected outcome: ${request.suggestedOutcome}`,
      status: "pending",
      // Deterministic (from the request, not Date.now()) so re-derives are stable.
      createdAt: request.createdAt,
      specialist: "Research Agent",
      category: "research_start",
      source: "research_agent",
      researchRequestId: request.id,
    }));
}
