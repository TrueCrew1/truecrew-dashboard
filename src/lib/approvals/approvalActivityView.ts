import { MONITOR_PLATFORM_APPROVAL_ID } from "@/components/chief/monitorApprovalCards";
import { isResearchMonitorIncidentPostmortemProposal } from "@/components/chief/researchIncidentProposal";
import { isResearchProjectSummaryHandoffProposal } from "@/components/chief/researchProjectSummaryHandoff";
import type { ApprovalProposal, ApprovalStatus } from "@/components/chief/types";
import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
} from "../../../lib/missions/types";
import type { ApprovalActivityRecord } from "../../../lib/approvals/types";
import { dedupeApprovalActivityRecords } from "../../../lib/approvals/approvalActivity";

export const APPROVAL_ACTIVITY_ROW_LIMIT = 5;

export interface ApprovalActivityItem {
  proposalId: string;
  title: string;
  summary: string;
  status: ApprovalStatus;
  kindLabel: string;
  sortAt: string;
  isPending: boolean;
}

export interface BuildApprovalActivityItemsInput {
  approvals: readonly ApprovalProposal[];
  vaultRecords: readonly ApprovalActivityRecord[];
  sessionRecords: readonly ApprovalActivityRecord[];
  limit?: number;
}

export function isGovernedApprovalProposal(
  proposal: Pick<ApprovalProposal, "id" | "missionKind" | "missionProjectId">,
): boolean {
  return (
    isResearchProjectSummaryHandoffProposal(proposal) ||
    isResearchMonitorIncidentPostmortemProposal(proposal) ||
    proposal.id === MONITOR_PLATFORM_APPROVAL_ID
  );
}

export function isGovernedApprovalActivityRecord(
  record: Pick<ApprovalActivityRecord, "proposalId" | "missionKind">,
): boolean {
  if (record.proposalId === MONITOR_PLATFORM_APPROVAL_ID) return true;
  if (record.missionKind === RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND) return true;
  if (record.missionKind === RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND) return true;
  return (
    record.proposalId.startsWith("apr-research-psh-") ||
    record.proposalId.startsWith("apr-research-incident-")
  );
}

export function governedApprovalKindLabel(
  input: Pick<ApprovalProposal, "id" | "missionKind" | "missionProjectId">,
): string {
  if (input.id === MONITOR_PLATFORM_APPROVAL_ID) return "Monitor platform";
  if (isResearchMonitorIncidentPostmortemProposal(input)) return "Incident postmortem";
  if (isResearchProjectSummaryHandoffProposal(input)) return "Project handoff";
  if (input.missionKind === RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND) {
    return "Incident postmortem";
  }
  if (input.missionKind === RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND) return "Project handoff";
  return "Governed approval";
}

function kindLabelFromRecord(record: ApprovalActivityRecord): string {
  return governedApprovalKindLabel({
    id: record.proposalId,
    missionKind: record.missionKind,
    missionProjectId: undefined,
  });
}

function sortTimestampForProposal(proposal: ApprovalProposal): string {
  if (proposal.status === "pending") return proposal.createdAt;
  return proposal.decidedAt ?? proposal.updatedAt ?? proposal.createdAt;
}

export function itemFromApprovalProposal(proposal: ApprovalProposal): ApprovalActivityItem {
  return {
    proposalId: proposal.id,
    title: proposal.title,
    summary: proposal.summary,
    status: proposal.status,
    kindLabel: governedApprovalKindLabel(proposal),
    sortAt: sortTimestampForProposal(proposal),
    isPending: proposal.status === "pending",
  };
}

export function itemFromApprovalActivityRecord(record: ApprovalActivityRecord): ApprovalActivityItem {
  return {
    proposalId: record.proposalId,
    title: record.title,
    summary: record.summary,
    status: record.decision,
    kindLabel: kindLabelFromRecord(record),
    sortAt: record.decidedAt,
    isPending: false,
  };
}

function compareBySortAtDesc(a: ApprovalActivityItem, b: ApprovalActivityItem): number {
  return new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime();
}

export function buildApprovalActivityItems(
  input: BuildApprovalActivityItemsInput,
): ApprovalActivityItem[] {
  const limit = input.limit ?? APPROVAL_ACTIVITY_ROW_LIMIT;
  const governedApprovals = input.approvals.filter(isGovernedApprovalProposal);
  const pendingIds = new Set(
    governedApprovals.filter((proposal) => proposal.status === "pending").map((p) => p.id),
  );

  const byProposalId = new Map<string, ApprovalActivityItem>();

  const activityRecords = dedupeApprovalActivityRecords([
    ...input.vaultRecords.filter(isGovernedApprovalActivityRecord),
    ...input.sessionRecords.filter(isGovernedApprovalActivityRecord),
  ]);

  for (const record of activityRecords) {
    if (pendingIds.has(record.proposalId)) continue;
    byProposalId.set(record.proposalId, itemFromApprovalActivityRecord(record));
  }

  for (const proposal of governedApprovals) {
    if (proposal.status === "pending") {
      byProposalId.set(proposal.id, itemFromApprovalProposal(proposal));
      continue;
    }
    if (!byProposalId.has(proposal.id)) {
      byProposalId.set(proposal.id, itemFromApprovalProposal(proposal));
    }
  }

  const items = [...byProposalId.values()];
  const pending = items.filter((item) => item.isPending).sort(compareBySortAtDesc);
  const decided = items.filter((item) => !item.isPending).sort(compareBySortAtDesc);

  return [...pending, ...decided].slice(0, Math.max(0, limit));
}
