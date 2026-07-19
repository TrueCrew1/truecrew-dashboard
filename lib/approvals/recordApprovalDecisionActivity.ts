import { logDecision } from "../obsidian/log.js";
import { buildApprovalActivityRecord } from "./approvalActivity.js";
import { saveApprovalActivityRecord } from "./approvalActivityStore.js";
import type { ApprovalActivitySnapshotInput } from "./types.js";

export async function recordApprovalDecisionActivity(
  input: ApprovalActivitySnapshotInput,
): Promise<{ vaultPath: string; obsidianDecisionPath: string }> {
  const record = buildApprovalActivityRecord(input);
  const vaultPath = await saveApprovalActivityRecord(record);

  const contextParts = [
    input.summary.trim(),
    input.source ? `Source: ${input.source}` : null,
    input.category ? `Category: ${input.category}` : null,
    input.missionKind ? `Mission: ${input.missionKind}` : null,
  ].filter((part): part is string => Boolean(part));

  const decisionNote = await logDecision({
    title: record.title,
    context: contextParts.join("\n") || undefined,
    decision: record.decision.replace(/_/g, " "),
    consequences: `Proposal ${record.proposalId}`,
    loggedAt: new Date(record.decidedAt),
  });

  return {
    vaultPath,
    obsidianDecisionPath: decisionNote.obsidianPath,
  };
}
