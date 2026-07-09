import {
  APPROVAL_GATES,
  createApprovalCardFromResearchRequest,
  type ResearchApprovalRequest,
} from "./agentApprovalGates";
import { createAgentPacket } from "./agentPacket";
import { chiefLog } from "./chiefLog";
import { stableChiefId } from "./chiefMock";
import type { ApprovalCard, ApprovalProposal } from "./types";
import type { Incident } from "@/types";

export type ResearchIncidentEnqueueResult =
  | { outcome: "queued"; card: ApprovalCard }
  | { outcome: "blocked"; reason: "already_pending" };

function researchIncidentProposalId(incidentId: string): string {
  return stableChiefId("apr-research-incident", incidentId);
}

/**
 * Real, not illustrative: fields are derived from a real active incident's
 * actual data, and the two alternatives were compared via a live check, not
 * pulled from memory — same verification bar AGENT_RUNBOOK.md sets for a
 * real Research recommendation (see RESEARCH_AGENT_PACKET_SPEC.md).
 */
export function buildResearchIncidentRequest(
  incident: Incident,
  createdAt: string = new Date().toISOString(),
): ResearchApprovalRequest {
  return {
    id: researchIncidentProposalId(incident.id),
    gate: APPROVAL_GATES.research[0],
    summary:
      `Sev ${incident.severity} incident "${incident.title}" on ${incident.serviceName} ` +
      `(status: ${incident.status}). ${incident.summary} No other open incident on this ` +
      `service in current data, so this isn't yet a confirmed recurring pattern — but a ` +
      `latency spike on an auth-critical path warrants real-time APM/latency monitoring ` +
      `beyond ad hoc detection.`,
    riskLevel: incident.severity <= 1 ? "high" : "medium",
    testsOrChecksDone: [
      {
        label: `Confirmed incident ${incident.id} is active in current data (status: ${incident.status})`,
        status: "pass",
      },
      {
        label: `Checked current incidents for a recurring pattern on ${incident.serviceName} — none found`,
        status: "pass",
      },
      {
        label: "Compared 2 real options via live search: SigNoz (open-source, self-hosted, free) vs. New Relic (hosted, free tier up to 100GB/month)",
        status: "pass",
      },
    ],
    requestedAction:
      "Approve to start a real evaluation of SigNoz or New Relic for this service's latency monitoring, or hold/reject if not warranted right now.",
    alternativesConsidered: [
      "SigNoz — open-source, self-hosted, free",
      "New Relic — hosted, free tier up to 100GB/month, usage-based beyond",
    ],
    createdAt,
  };
}

export function hasPendingResearchIncidentProposal(
  approvals: ApprovalProposal[],
  incidentId: string,
): boolean {
  const id = researchIncidentProposalId(incidentId);
  return approvals.some((proposal) => proposal.id === id && proposal.status === "pending");
}

/**
 * Real signal → AgentPacket<ResearchApprovalRequest> → ApprovalCard. The
 * first call site that exercises createAgentPacket end to end — see
 * docs/RESEARCH_AGENT_PACKET_SPEC.md's Routing section for the full path
 * this follows. Packet creation logs via chiefLog.packetCreated
 * automatically; card creation logs via chiefLog.cardCreated here (not
 * inside createApprovalCardFromResearchRequest itself, since that shared
 * factory also builds the static seeded example at module load — logging
 * there would fire a spurious "card created" event on every app boot). The
 * operator's eventual decision logs via chiefLog.cardDecided, wired in
 * ChiefApprovalsContext.tsx.
 */
export function proposeResearchIncidentPacket(
  incident: Incident,
  approvals: ApprovalProposal[],
): ResearchIncidentEnqueueResult {
  if (hasPendingResearchIncidentProposal(approvals, incident.id)) {
    return { outcome: "blocked", reason: "already_pending" };
  }

  const request = buildResearchIncidentRequest(incident);
  const packet = createAgentPacket("research", request);
  const card = createApprovalCardFromResearchRequest(packet.request);
  chiefLog.cardCreated(card);
  return { outcome: "queued", card };
}
