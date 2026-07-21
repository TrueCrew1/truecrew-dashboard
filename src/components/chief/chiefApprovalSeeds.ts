/**
 * Seed helpers for the Chief approval queue.
 * Operator path starts empty of stubs; stub/demo cards are opt-in only.
 */

import { areChiefStubApprovalsEnabled } from "../../../lib/chief/workTruth";
import { STUB_AGENT_APPROVAL_CARDS } from "./agentApprovalGates";
import { MOCK_PR_APPROVAL_CARDS } from "./chiefApprovalCardMocks";
import { REPO_CHANGE_APPROVAL_CARDS } from "./repoChangeApprovals";
import type { ApprovalProposal } from "./types";

function asStub(cards: ApprovalProposal[]): ApprovalProposal[] {
  return cards.map((card) => ({ ...card, workTruth: "stub" as const }));
}

/**
 * Initial session seed for commandApprovals.
 * - Operator / default: empty (real work comes from deriveApprovalCandidates,
 *   monitor probes, and executable command intents).
 * - Stub mode (VITE_SHOW_CHIEF_STUB_APPROVALS=true): demo PR + example agent
 *   + historical repo-change seeds, all labeled stub.
 */
export function getChiefOperatorSeedApprovals(): ApprovalProposal[] {
  if (!areChiefStubApprovalsEnabled()) {
    return [];
  }

  return [
    ...asStub(MOCK_PR_APPROVAL_CARDS),
    ...asStub(REPO_CHANGE_APPROVAL_CARDS),
    ...STUB_AGENT_APPROVAL_CARDS,
  ];
}
