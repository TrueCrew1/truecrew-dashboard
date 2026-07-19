import {
  createApprovalCardFromResearchRequest,
  type ResearchApprovalRequest,
} from "./agentApprovalGates";
import { RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND } from "../../../lib/missions/types";
import { createAgentPacket } from "./agentPacket";
import { chiefLog } from "./chiefLog";
import { stableChiefId } from "./chiefMock";
import type { ApprovalCard, ApprovalProposal } from "./types";
import type { Workflow } from "@/types";

export type ResearchProjectSummaryHandoffEnqueueResult =
  | { outcome: "queued"; card: ApprovalCard }
  | { outcome: "blocked"; reason: "already_pending" };

export const RESEARCH_PROJECT_SUMMARY_HANDOFF_GATE = "Project summary and build handoff";

export function researchProjectSummaryHandoffProposalId(projectId: string): string {
  return stableChiefId("apr-research-psh", projectId);
}

export function buildResearchProjectSummaryHandoffRequest(
  workflow: Workflow,
  createdAt: string = new Date().toISOString(),
): ResearchApprovalRequest {
  const linkedTaskCount = workflow.linkedTaskIds.length;
  return {
    id: researchProjectSummaryHandoffProposalId(workflow.id),
    gate: RESEARCH_PROJECT_SUMMARY_HANDOFF_GATE,
    summary:
      `Research proposes a live operational summary and build handoff for "${workflow.title}" ` +
      `(stage: ${workflow.stage}, owner: ${workflow.owner}). ${workflow.summary} ` +
      `Linked tasks in current data: ${linkedTaskCount}.`,
    riskLevel: workflow.stage === "In Progress" ? "medium" : "low",
    testsOrChecksDone: [
      {
        label: `Confirmed workflow ${workflow.id} exists in current command-center data`,
        status: "pass",
      },
      {
        label: `Counted ${linkedTaskCount} linked task(s) for handoff context`,
        status: linkedTaskCount > 0 ? "pass" : "pending",
      },
      {
        label: "Mission will load workflow + tasks from Supabase and call the live Research LLM lane",
        status: "pending",
      },
    ],
    requestedAction:
      "Approve to run Research: generate project summary, risks, open questions, and build handoff artifact in Obsidian.",
    alternativesConsidered: [
      "Manual supervisor summary in Obsidian (no LLM, slower)",
      "Defer handoff until build stage gates are complete",
    ],
    missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    missionProjectId: workflow.id,
    createdAt,
  };
}

export function hasPendingResearchProjectSummaryHandoffProposal(
  approvals: ApprovalProposal[],
  projectId: string,
): boolean {
  const id = researchProjectSummaryHandoffProposalId(projectId);
  return approvals.some((proposal) => proposal.id === id && proposal.status === "pending");
}

export function isResearchProjectSummaryHandoffProposal(
  proposal: Pick<ApprovalProposal, "id" | "missionKind" | "missionProjectId">,
): boolean {
  if (proposal.missionKind === RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND) return true;
  return proposal.id.startsWith("apr-research-psh-");
}

export function proposeResearchProjectSummaryHandoffPacket(
  workflow: Workflow,
  approvals: ApprovalProposal[],
): ResearchProjectSummaryHandoffEnqueueResult {
  if (hasPendingResearchProjectSummaryHandoffProposal(approvals, workflow.id)) {
    return { outcome: "blocked", reason: "already_pending" };
  }

  const request = buildResearchProjectSummaryHandoffRequest(workflow);
  const packet = createAgentPacket("research", request);
  const card = createApprovalCardFromResearchRequest(packet.request);
  chiefLog.cardCreated(card);
  return { outcome: "queued", card };
}

export function projectIdForResearchProjectSummaryHandoffProposal(
  proposal: Pick<ApprovalProposal, "missionProjectId" | "id">,
): string | null {
  if (proposal.missionProjectId) return proposal.missionProjectId;
  return null;
}
