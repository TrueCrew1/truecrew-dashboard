import type { ApprovalCard } from "./types";

/**
 * Single call site for static approval seeds on the operator queue.
 *
 * Demo PR cards (chiefApprovalCardMocks.ts), agent examples, and wired repo
 * cards (agentApprovalGates.ts, repoChangeApprovals.ts) remain as test and
 * extension fixtures only — they are not loaded here. The queue is filled by
 * live-derived signals (Supabase rail), Chief command session proposals, and
 * future real approval integrations.
 */
export function getSeedApprovalCards(): ApprovalCard[] {
  return [];
}
