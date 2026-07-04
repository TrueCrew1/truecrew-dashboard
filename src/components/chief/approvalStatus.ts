import type { ApprovalProposal } from "./types";

/** Hours after decision timestamp to count as a recent decision. */
export const APPROVAL_RECENT_DECISION_HOURS = 24;

/** Hours a pending proposal can sit before it's flagged as stale. */
export const APPROVAL_STALE_PENDING_HOURS = 24;

export type ApprovalStatusFilter = "all" | "pending" | "approved" | "returned" | "recent";

export interface ApprovalStatusSummary {
  total: number;
  pending: number;
  approved: number;
  returned: number;
  recentDecisions: number;
  stalePending: number;
}

export const APPROVAL_STATUS_FILTER_LABEL: Record<Exclude<ApprovalStatusFilter, "all">, string> = {
  pending: "Needs approval",
  approved: "Approved",
  returned: "Rejected / sent back",
  recent: "Recent decisions",
};

function isRecentDecision(
  proposal: ApprovalProposal,
  now: number,
  recentWindowMs: number,
): boolean {
  if (proposal.status === "pending" || !proposal.decidedAt) return false;
  const decidedMs = new Date(proposal.decidedAt).getTime();
  if (Number.isNaN(decidedMs)) return false;
  const ageMs = now - decidedMs;
  return ageMs >= 0 && ageMs <= recentWindowMs;
}

function isStalePending(
  proposal: ApprovalProposal,
  now: number,
  staleWindowMs: number,
): boolean {
  if (proposal.status !== "pending") return false;
  const createdMs = new Date(proposal.createdAt).getTime();
  if (Number.isNaN(createdMs)) return false;
  return now - createdMs >= staleWindowMs;
}

export function summarizeApprovalStatus(
  proposals: ApprovalProposal[],
  now: number = Date.now(),
  recentWindowMs: number = APPROVAL_RECENT_DECISION_HOURS * 60 * 60 * 1000,
  staleWindowMs: number = APPROVAL_STALE_PENDING_HOURS * 60 * 60 * 1000,
): ApprovalStatusSummary {
  let pending = 0;
  let approved = 0;
  let returned = 0;
  let recentDecisions = 0;
  let stalePending = 0;

  for (const proposal of proposals) {
    switch (proposal.status) {
      case "pending":
        pending += 1;
        break;
      case "approved":
        approved += 1;
        break;
      case "rejected":
      case "sent_back":
        returned += 1;
        break;
    }

    if (isRecentDecision(proposal, now, recentWindowMs)) {
      recentDecisions += 1;
    }
    if (isStalePending(proposal, now, staleWindowMs)) {
      stalePending += 1;
    }
  }

  return {
    total: proposals.length,
    pending,
    approved,
    returned,
    recentDecisions,
    stalePending,
  };
}

export function filterApprovalsByStatus(
  proposals: ApprovalProposal[],
  filter: ApprovalStatusFilter,
  now: number = Date.now(),
  recentWindowMs: number = APPROVAL_RECENT_DECISION_HOURS * 60 * 60 * 1000,
): ApprovalProposal[] {
  if (filter === "all") return proposals;

  return proposals.filter((proposal) => {
    switch (filter) {
      case "pending":
        return proposal.status === "pending";
      case "approved":
        return proposal.status === "approved";
      case "returned":
        return proposal.status === "rejected" || proposal.status === "sent_back";
      case "recent":
        return isRecentDecision(proposal, now, recentWindowMs);
      default:
        return true;
    }
  });
}
