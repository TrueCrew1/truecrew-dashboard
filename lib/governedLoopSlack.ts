import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
  type MissionStatus,
  type MonitorIncidentPostmortemMission,
  type ProjectSummaryHandoffMission,
} from "./missions/types.js";

export async function governedLoopSlack(message: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      console.warn(
        `governedLoopSlack: webhook returned ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.warn(
      "governedLoopSlack: failed to post message",
      error instanceof Error ? error.message : error,
    );
  }
}

/** Fire-and-forget wrapper so callers never await Slack I/O. */
export function scheduleGovernedLoopSlack(message: string): void {
  void governedLoopSlack(message);
}

const MONITOR_PLATFORM_APPROVAL_PREFIX = "apr-monitor-platform-";

export function isGovernedChiefApproval(input: {
  proposalId: string;
  missionKind?: string;
}): boolean {
  if (input.missionKind) return true;
  return input.proposalId.startsWith(MONITOR_PLATFORM_APPROVAL_PREFIX);
}

function approvalKindLabel(missionKind?: string, proposalId?: string): string {
  if (missionKind) return missionKind;
  if (proposalId?.startsWith(MONITOR_PLATFORM_APPROVAL_PREFIX)) {
    return "monitor-platform";
  }
  return "chief-approval";
}

function incidentIdForApproval(input: {
  missionKind?: string;
  missionProjectId?: string;
}): string {
  if (input.missionKind === RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND) {
    return input.missionProjectId?.trim() || "n/a";
  }
  return "n/a";
}

export function formatGovernedApprovalCreatedMessage(input: {
  approvalId: string;
  missionKind?: string;
  missionProjectId?: string;
}): string {
  const kind = approvalKindLabel(input.missionKind, input.approvalId);
  const incidentId = incidentIdForApproval(input);
  return `Chief approval created: ${input.approvalId} (${kind}) for incident ${incidentId}.`;
}

export function formatGovernedApprovalUpdatedMessage(input: {
  approvalId: string;
  status: string;
  missionKind?: string;
  missionProjectId?: string;
}): string {
  const kind = approvalKindLabel(input.missionKind, input.approvalId);
  const incidentId = incidentIdForApproval(input);
  return `Chief approval updated: ${input.approvalId} is ${input.status} (kind=${kind}, incident=${incidentId}).`;
}

function missionResultLink(
  mission: ProjectSummaryHandoffMission | MonitorIncidentPostmortemMission,
): string {
  if (mission.outputNotePath?.trim()) return mission.outputNotePath.trim();
  if (mission.handoffArtifactPath?.trim()) return mission.handoffArtifactPath.trim();
  return "none";
}

export function formatGovernedMissionStatusMessage(input: {
  missionId: string;
  status: MissionStatus;
  approvalId: string;
  resultLink?: string;
}): string {
  const result = input.resultLink?.trim() || "none";
  return `Governed mission ${input.missionId} status: ${input.status} (approval=${input.approvalId}, result=${result}).`;
}

export function formatMonitorStateMessage(input: {
  state: string;
  probeId: string;
  incidentId?: string;
}): string {
  const incident = input.incidentId?.trim() || "none";
  return `Monitor state: ${input.state} (probe=${input.probeId}, incident=${incident}).`;
}

export function scheduleGovernedApprovalCreatedSlack(input: {
  approvalId: string;
  missionKind?: string;
  missionProjectId?: string;
}): void {
  if (
    !isGovernedChiefApproval({
      proposalId: input.approvalId,
      missionKind: input.missionKind,
    })
  ) {
    return;
  }
  scheduleGovernedLoopSlack(formatGovernedApprovalCreatedMessage(input));
}

export function scheduleGovernedApprovalUpdatedSlack(input: {
  approvalId: string;
  status: string;
  missionKind?: string;
  missionProjectId?: string;
}): void {
  if (
    !isGovernedChiefApproval({
      proposalId: input.approvalId,
      missionKind: input.missionKind,
    })
  ) {
    return;
  }
  scheduleGovernedLoopSlack(formatGovernedApprovalUpdatedMessage(input));
}

export function scheduleGovernedMissionSlack(
  mission: ProjectSummaryHandoffMission | MonitorIncidentPostmortemMission,
): void {
  if (
    mission.kind !== RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND &&
    mission.kind !== RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND
  ) {
    return;
  }

  scheduleGovernedLoopSlack(
    formatGovernedMissionStatusMessage({
      missionId: mission.id,
      status: mission.status,
      approvalId: mission.proposalId,
      resultLink: missionResultLink(mission),
    }),
  );
}
