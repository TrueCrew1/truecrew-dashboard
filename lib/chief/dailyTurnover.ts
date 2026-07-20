import type { ApprovalActivityRecord } from "../approvals/types.js";
import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
  type MissionStatus,
  type MonitorIncidentPostmortemMission,
  type ProjectSummaryHandoffMission,
} from "../missions/types.js";

export const TURNOVER_PREFIX = "[TURNOVER]";
export const DEFAULT_TURNOVER_WINDOW_HOURS = 24;

export type GovernedMission = ProjectSummaryHandoffMission | MonitorIncidentPostmortemMission;

export interface DailyTurnoverDecisionRow {
  proposalId: string;
  status: string;
  decidedAt: string;
}

export interface DailyTurnoverHealthSnapshot {
  vault: string;
  supabase: string;
  slackWebhook: string;
  githubWebhook: string;
  repoHealth: string;
}

export interface DailyTurnoverCounts {
  approvedActivity24h: number;
  failedOrBlocked24h: number;
  pendingApprovals: number | null;
  pendingApprovalsNote: string;
  queuedMissions: number;
}

export interface DailyTurnoverSnapshot {
  generatedAt: string;
  windowHours: number;
  counts: DailyTurnoverCounts;
  health: DailyTurnoverHealthSnapshot;
  dataNotes: string[];
}

export function isGovernedApprovalActivityRecord(
  record: Pick<ApprovalActivityRecord, "proposalId" | "missionKind">,
): boolean {
  if (record.proposalId.startsWith("apr-monitor-platform-")) return true;
  if (record.missionKind === RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND) return true;
  if (record.missionKind === RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND) return true;
  return (
    record.proposalId.startsWith("apr-research-psh-") ||
    record.proposalId.startsWith("apr-research-incident-")
  );
}

function isWithinWindow(isoTimestamp: string, windowStartMs: number): boolean {
  const parsed = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(parsed)) return false;
  return parsed >= windowStartMs;
}

function windowStartMs(generatedAt: string, windowHours: number): number {
  const end = new Date(generatedAt).getTime();
  return end - windowHours * 60 * 60 * 1000;
}

export function countApprovedActivity24h(input: {
  generatedAt: string;
  windowHours: number;
  vaultRecords: readonly ApprovalActivityRecord[];
  supabaseDecisions: readonly DailyTurnoverDecisionRow[];
}): number {
  const startMs = windowStartMs(input.generatedAt, input.windowHours);
  const approvedProposalIds = new Set<string>();

  for (const record of input.vaultRecords) {
    if (!isGovernedApprovalActivityRecord(record)) continue;
    if (record.decision !== "approved") continue;
    if (!isWithinWindow(record.decidedAt, startMs)) continue;
    approvedProposalIds.add(record.proposalId);
  }

  for (const row of input.supabaseDecisions) {
    if (row.status !== "approved") continue;
    if (!isWithinWindow(row.decidedAt, startMs)) continue;
    approvedProposalIds.add(row.proposalId);
  }

  return approvedProposalIds.size;
}

function isFailedOrBlockedStatus(status: MissionStatus): boolean {
  return status === "failed" || status === "blocked";
}

export function countFailedOrBlockedMissions24h(input: {
  generatedAt: string;
  windowHours: number;
  missions: readonly GovernedMission[];
}): number {
  const startMs = windowStartMs(input.generatedAt, input.windowHours);
  return input.missions.filter(
    (mission) =>
      isFailedOrBlockedStatus(mission.status) &&
      isWithinWindow(mission.updatedAt, startMs),
  ).length;
}

export function countQueuedMissions(missions: readonly GovernedMission[]): number {
  return missions.filter((mission) => mission.status === "queued").length;
}

export function buildDailyTurnoverSnapshot(input: {
  generatedAt: string;
  windowHours?: number;
  vaultRecords: readonly ApprovalActivityRecord[];
  supabaseDecisions: readonly DailyTurnoverDecisionRow[];
  missions: readonly GovernedMission[];
  health: DailyTurnoverHealthSnapshot;
  dataNotes?: string[];
  pendingApprovals?: number | null;
  pendingApprovalsNote?: string;
}): DailyTurnoverSnapshot {
  const windowHours = input.windowHours ?? DEFAULT_TURNOVER_WINDOW_HOURS;

  return {
    generatedAt: input.generatedAt,
    windowHours,
    counts: {
      approvedActivity24h: countApprovedActivity24h({
        generatedAt: input.generatedAt,
        windowHours,
        vaultRecords: input.vaultRecords,
        supabaseDecisions: input.supabaseDecisions,
      }),
      failedOrBlocked24h: countFailedOrBlockedMissions24h({
        generatedAt: input.generatedAt,
        windowHours,
        missions: input.missions,
      }),
      pendingApprovals: input.pendingApprovals ?? null,
      pendingApprovalsNote:
        input.pendingApprovalsNote ??
        "not persisted server-side in V1 (use Chief Approvals UI)",
      queuedMissions: countQueuedMissions(input.missions),
    },
    health: input.health,
    dataNotes: input.dataNotes ?? [],
  };
}

export function formatDailyTurnoverSlackMessage(snapshot: DailyTurnoverSnapshot): string {
  const pendingLine =
    snapshot.counts.pendingApprovals === null
      ? `Pending approvals: n/a (${snapshot.counts.pendingApprovalsNote})`
      : `Pending approvals: ${snapshot.counts.pendingApprovals}`;

  const dataNotes =
    snapshot.dataNotes.length > 0
      ? `\nData notes: ${snapshot.dataNotes.join("; ")}`
      : "";

  return [
    `${TURNOVER_PREFIX} Chief daily turnover — ${snapshot.generatedAt}`,
    "",
    `Approved activity (${snapshot.windowHours}h): ${snapshot.counts.approvedActivity24h}`,
    `Failed/blocked missions (${snapshot.windowHours}h): ${snapshot.counts.failedOrBlocked24h}`,
    pendingLine,
    `Queued missions (awaiting run): ${snapshot.counts.queuedMissions}`,
    "",
    "Integration health:",
    `- vault: ${snapshot.health.vault}`,
    `- supabase: ${snapshot.health.supabase}`,
    `- slack webhook: ${snapshot.health.slackWebhook}`,
    `- github webhook: ${snapshot.health.githubWebhook}`,
    `- repo health: ${snapshot.health.repoHealth}`,
    dataNotes,
  ]
    .filter((line, index, lines) => !(line === "" && lines[index - 1] === ""))
    .join("\n");
}
