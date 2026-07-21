import type { MockData } from "@/data/mockData";
import { classifyChiefEvaluation, evaluationInputFromChiefResponse } from "./chiefDecisionTier";
import { resolveChiefCommand, type ChiefLiveContext } from "./chiefLiveContext";
import { buildApprovalFromResponse, buildHistoryEntry } from "./chiefMock";
import type { ApprovalProposal, ChiefResponse, CommandHistoryEntry } from "./types";

export interface ChiefCommandResult {
  response: ChiefResponse;
  historyEntry: CommandHistoryEntry;
  newApproval: ApprovalProposal | null;
}

/**
 * The single command-resolution pipeline: resolve → classify decision tier →
 * build history/approval records. Shared by ChiefPanel's own command input
 * and the global command bar, so both surfaces run the exact same Chief
 * logic and land in the same history/approvals queue (ChiefApprovalsContext)
 * rather than each having their own copy.
 */
export function runChiefCommand(
  command: string,
  data: MockData,
  liveContext: ChiefLiveContext,
  approvalCandidates: ApprovalProposal[],
): ChiefCommandResult {
  const resolved = resolveChiefCommand(command, data, liveContext, approvalCandidates);
  const evaluation = classifyChiefEvaluation(evaluationInputFromChiefResponse(resolved));
  const response: ChiefResponse = {
    ...resolved,
    decisionTier: evaluation.tier,
    approvalPacket: evaluation.approvalPacket,
  };

  return {
    response,
    historyEntry: buildHistoryEntry(command, response),
    newApproval: buildApprovalFromResponse(command, response),
  };
}
