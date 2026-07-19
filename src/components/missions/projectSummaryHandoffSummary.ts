import type { ProjectSummaryHandoffMissionPayload } from "@/lib/api/researchMission";

export type HandoffMissionStatus = ProjectSummaryHandoffMissionPayload["status"];

export const HANDOFF_MISSION_STATUSES: readonly HandoffMissionStatus[] = [
  "queued",
  "running",
  "completed",
  "blocked",
  "failed",
] as const;

export type HandoffMissionStatusCounts = Record<HandoffMissionStatus, number>;

export function countHandoffMissionsByStatus(
  missions: ProjectSummaryHandoffMissionPayload[],
): HandoffMissionStatusCounts {
  const counts: HandoffMissionStatusCounts = {
    queued: 0,
    running: 0,
    completed: 0,
    blocked: 0,
    failed: 0,
  };

  for (const mission of missions) {
    counts[mission.status] += 1;
  }

  return counts;
}

export function sortHandoffMissionsByRecency(
  missions: ProjectSummaryHandoffMissionPayload[],
): ProjectSummaryHandoffMissionPayload[] {
  return [...missions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function recentHandoffMissions(
  missions: ProjectSummaryHandoffMissionPayload[],
  limit = 5,
): ProjectSummaryHandoffMissionPayload[] {
  return sortHandoffMissionsByRecency(missions).slice(0, limit);
}

export function handoffMissionsByProposalId(
  missions: ProjectSummaryHandoffMissionPayload[],
): Map<string, ProjectSummaryHandoffMissionPayload> {
  return new Map(missions.map((mission) => [mission.proposalId, mission]));
}
