import { AGENT_APPROVAL_CARDS } from "./agentApprovalGates";
import { MOCK_PR_APPROVAL_CARDS } from "./chiefApprovalCardMocks";
import { REPO_CHANGE_APPROVAL_CARDS } from "./repoChangeApprovals";
import type { ApprovalCard } from "./types";

/**
 * Single call site for every static approval-seed source, so the "which
 * sources feed the queue" question has one answer instead of three files
 * spread ad hoc at the call site. See agentApprovalGates.ts's header and
 * docs/AGENT_WORKFLOW.md for the single-queue rule this preserves.
 */
export function getSeedApprovalCards(): ApprovalCard[] {
  return [...MOCK_PR_APPROVAL_CARDS, ...REPO_CHANGE_APPROVAL_CARDS, ...AGENT_APPROVAL_CARDS];
}
