import type { ResearchMissionPayload } from "./researchMonitorIncidentPostmortem";
import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
} from "../../../lib/missions/types";
import { ROLLING_LOG_PATHS } from "../../../lib/obsidian/paths";

export const PROJECT_SUMMARY_HANDOFF_MISSION_DIR =
  "Operations/Missions/project-summary-handoff";

export const MONITOR_INCIDENT_POSTMORTEM_MISSION_DIR =
  "Operations/Missions/monitor-incident-postmortem";

export interface ApprovalResultLink {
  label: string;
  path: string;
}

export function projectSummaryHandoffMissionRecordPath(missionId: string): string {
  return `${PROJECT_SUMMARY_HANDOFF_MISSION_DIR}/${missionId}.json`;
}

export function monitorIncidentPostmortemMissionRecordPath(missionId: string): string {
  return `${MONITOR_INCIDENT_POSTMORTEM_MISSION_DIR}/${missionId}.json`;
}

function missionRecordPath(mission: ResearchMissionPayload): string {
  if (mission.kind === RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND) {
    return monitorIncidentPostmortemMissionRecordPath(mission.id);
  }
  return projectSummaryHandoffMissionRecordPath(mission.id);
}

export function deriveResearchMissionResultLinks(
  mission: ResearchMissionPayload | null | undefined,
): ApprovalResultLink[] {
  if (!mission?.id) return [];

  const links: ApprovalResultLink[] = [
    {
      label: "Mission record",
      path: missionRecordPath(mission),
    },
  ];

  const notePath = mission.outputNotePath?.trim();
  if (notePath) {
    const noteLabel =
      mission.kind === RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND
        ? "Postmortem note"
        : "Handoff note";
    links.push({ label: noteLabel, path: notePath });
  }

  const artifactPath = mission.handoffArtifactPath?.trim();
  if (artifactPath) {
    links.push({ label: "Artifact", path: artifactPath });
  }

  if (mission.status === "completed") {
    links.push({ label: "Build Log", path: ROLLING_LOG_PATHS.build });
  }

  return links;
}

export interface DeriveApprovalResultLinksInput {
  mission?: ResearchMissionPayload | null;
  missionKind?: string | null;
  liveApiEnabled: boolean;
}

export function deriveApprovalResultLinks(
  input: DeriveApprovalResultLinksInput,
): ApprovalResultLink[] {
  if (!input.liveApiEnabled || !input.mission) return [];

  const kind = input.missionKind ?? input.mission.kind;
  if (
    kind !== RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND &&
    kind !== RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND
  ) {
    return [];
  }

  return deriveResearchMissionResultLinks(input.mission);
}

/** @deprecated Use deriveResearchMissionResultLinks */
export function deriveHandoffMissionResultLinks(
  mission: ResearchMissionPayload | null | undefined,
): ApprovalResultLink[] {
  return deriveResearchMissionResultLinks(mission);
}

export function formatMissionOutputRefs(links: readonly ApprovalResultLink[]): string | null {
  if (links.length === 0) return null;
  return links.map((link) => `${link.label}: ${link.path}`).join(" · ");
}
