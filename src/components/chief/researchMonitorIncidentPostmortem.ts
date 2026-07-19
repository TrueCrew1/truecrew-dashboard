import { RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND } from "../../../lib/missions/types";
import type { MonitorIncidentPostmortemMissionPayload } from "@/lib/api/researchPostmortemMission";
import type { ProjectSummaryHandoffMissionPayload } from "@/lib/api/researchMission";

export type ResearchMissionPayload =
  | ProjectSummaryHandoffMissionPayload
  | MonitorIncidentPostmortemMissionPayload;

export function isResearchMissionPayload(
  mission: ResearchMissionPayload | null | undefined,
): mission is ResearchMissionPayload {
  return Boolean(mission?.id && mission.proposalId);
}

export function mergeResearchMissionsByProposalId(
  handoffMissions: ProjectSummaryHandoffMissionPayload[],
  postmortemMissions: MonitorIncidentPostmortemMissionPayload[],
): Map<string, ResearchMissionPayload> {
  const map = new Map<string, ResearchMissionPayload>();
  for (const mission of handoffMissions) {
    map.set(mission.proposalId, mission);
  }
  for (const mission of postmortemMissions) {
    map.set(mission.proposalId, mission);
  }
  return map;
}

export { RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND };
