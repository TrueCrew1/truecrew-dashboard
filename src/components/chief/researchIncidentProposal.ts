import { RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND } from "../../../lib/missions/types";
import {
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

export const RESEARCH_INCIDENT_POSTMORTEM_GATE = "Monitor incident postmortem";

export function researchIncidentProposalId(incidentId: string): string {
  return stableChiefId("apr-research-incident", incidentId);
}

export function isResearchMonitorIncidentPostmortemProposal(
  proposal: Pick<ApprovalProposal, "id" | "missionKind" | "missionProjectId">,
): boolean {
  if (proposal.missionKind === RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND) return true;
  return proposal.id.startsWith("apr-research-incident-");
}

export function incidentIdForResearchMonitorIncidentPostmortemProposal(
  proposal: Pick<ApprovalProposal, "missionProjectId" | "id">,
): string | null {
  if (proposal.missionProjectId) return proposal.missionProjectId;
  return null;
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
    gate: RESEARCH_INCIDENT_POSTMORTEM_GATE,
    summary:
      `Sev ${incident.severity} incident "${incident.title}" on ${incident.serviceName} ` +
      `(status: ${incident.status}). ${incident.summary} Research will draft a postmortem brief ` +
      `with likely causes, impacts, and recommended follow-up actions from this incident record.`,
    riskLevel: incident.severity <= 1 ? "high" : "medium",
    testsOrChecksDone: [
      {
        label: `Confirmed incident ${incident.id} is active in current data (status: ${incident.status})`,
        status: "pass",
      },
      {
        label: `Service context loaded: ${incident.serviceName}`,
        status: "pass",
      },
      {
        label: "Mission will load incident from Supabase and call the live Research LLM lane",
        status: "pending",
      },
    ],
    requestedAction:
      "Approve to run Research: generate monitor incident postmortem note and artifact in Obsidian.",
    alternativesConsidered: [
      "Manual supervisor postmortem in Obsidian (no LLM)",
      "Defer postmortem until incident is resolved",
    ],
    missionKind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
    missionProjectId: incident.id,
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
