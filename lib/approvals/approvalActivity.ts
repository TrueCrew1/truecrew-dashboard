import type { ApprovalActivityRecord, ApprovalActivitySnapshotInput } from "./types.js";

export function buildApprovalActivityRecord(
  input: ApprovalActivitySnapshotInput,
): ApprovalActivityRecord {
  return {
    proposalId: input.proposalId,
    title: input.title.trim() || "Untitled approval",
    summary: input.summary.trim(),
    decision: input.decision,
    decidedAt: input.decidedAt,
    actor: input.actor,
    source: input.source,
    category: input.category,
    missionKind: input.missionKind,
    recordedAt: new Date().toISOString(),
  };
}

/**
 * One durable row per proposal — keeps the latest decidedAt when duplicates appear.
 */
export function dedupeApprovalActivityRecords(
  records: readonly ApprovalActivityRecord[],
): ApprovalActivityRecord[] {
  const byProposal = new Map<string, ApprovalActivityRecord>();

  for (const record of records) {
    const existing = byProposal.get(record.proposalId);
    if (!existing) {
      byProposal.set(record.proposalId, record);
      continue;
    }

    const existingTime = new Date(existing.decidedAt).getTime();
    const nextTime = new Date(record.decidedAt).getTime();
    if (nextTime >= existingTime) {
      byProposal.set(record.proposalId, record);
    }
  }

  return [...byProposal.values()];
}

export function deriveApprovalActivityItems(
  records: readonly ApprovalActivityRecord[],
  limit = 5,
): ApprovalActivityRecord[] {
  return dedupeApprovalActivityRecords(records)
    .sort((a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime())
    .slice(0, Math.max(0, limit));
}
