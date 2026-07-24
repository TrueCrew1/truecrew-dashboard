import type { ApprovalCard, ApprovalChecklistItem, ApprovalRecommendedDecision } from "./types";

export type RepoChangeRiskLevel = "low" | "medium" | "high";

/**
 * Repo-change → ApprovalCard mapper. Static PENDING_REPO_CHANGES seeds were
 * cleared (no mock/stale cards in Approvals). Extension point: replace with a
 * real scan (e.g. unmerged local branches, or a small local JSON file a build
 * step writes) instead of maintaining a hand-written list.
 */
export interface RepoChangeApproval {
  id: string;
  branch: string;
  commit: string;
  changeSummary: string;
  riskLevel: RepoChangeRiskLevel;
  testsOrChecksDone: ApprovalChecklistItem[];
  requestedAction: string;
  createdAt: string;
}

const RISK_TO_RECOMMENDATION: Record<RepoChangeRiskLevel, ApprovalRecommendedDecision> = {
  low: "approve",
  medium: "hold",
  high: "needs_changes",
};

export function repoChangeApprovalToCard(change: RepoChangeApproval): ApprovalCard {
  return {
    id: change.id,
    title: `Repo change ready for review: ${change.branch}`,
    summary: change.changeSummary,
    recommendedAction: change.requestedAction,
    riskNote: `Risk level: ${change.riskLevel}.`,
    status: "pending",
    createdAt: change.createdAt,
    source: "repo_change",
    recommendedDecision: RISK_TO_RECOMMENDATION[change.riskLevel],
    checklist: change.testsOrChecksDone,
    routeTo: "/knowledge",
    routeLabel: change.branch,
  };
}

/**
 * Hand-maintained local repo-change seeds used to live here. Cleared —
 * Approvals no longer shows stale static repo-change cards. Extension point:
 * replace with a real scan (unmerged branches / build-step JSON) when ready.
 */
export const PENDING_REPO_CHANGES: RepoChangeApproval[] = [];

export const REPO_CHANGE_APPROVAL_CARDS: ApprovalCard[] = PENDING_REPO_CHANGES.map(
  repoChangeApprovalToCard,
);
