import type { ResearchMissionPayload } from "./researchMonitorIncidentPostmortem";
import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
} from "../../../lib/missions/types";
import { isResearchMonitorIncidentPostmortemProposal } from "./researchIncidentProposal";
import { isResearchProjectSummaryHandoffProposal } from "./researchProjectSummaryHandoff";
import type { ApprovalProposal } from "./types";

export function isGovernedResearchMissionProposal(
  proposal: Pick<ApprovalProposal, "id" | "missionKind" | "missionProjectId">,
): boolean {
  return (
    isResearchProjectSummaryHandoffProposal(proposal) ||
    isResearchMonitorIncidentPostmortemProposal(proposal)
  );
}

export function missionKindLabel(mission: ResearchMissionPayload): string {
  if (mission.kind === RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND) {
    return "monitor-incident-postmortem";
  }
  return "project-summary-handoff";
}

export { RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND, RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND };
