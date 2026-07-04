import type { ApprovalCard, ApprovalChecklistItem, ApprovalRecommendedDecision } from "./types";

export type RepoChangeRiskLevel = "low" | "medium" | "high";

/**
 * A real, already-existing local repo change awaiting review before it gets
 * its own PR — grounded in actual branch/commit state, not a hypothetical.
 * This is Chief's first wired approval source beyond the PR-pattern demo
 * cards in chiefApprovalCardMocks.ts.
 *
 * Extension point: once more of these accumulate, replace the hand-written
 * PENDING_REPO_CHANGES list below with a real scan (e.g. unmerged local
 * branches, or a small local JSON file a build step writes) instead of
 * maintaining it by hand.
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
 * The decision-reason feature restored on feat/monitor/ui-client-safety
 * (see Build Log, 2026-07-04): a real commit sitting on a real branch,
 * not yet rebased onto main or opened as its own PR.
 */
export const PENDING_REPO_CHANGES: RepoChangeApproval[] = [
  {
    id: "repo-change-decision-reason",
    branch: "feat/monitor/ui-client-safety",
    commit: "cdc33ec",
    changeSummary:
      'Restores the in-progress "decision reason" feature on this branch — an optional reason field end-to-end for approval decisions (API parsing, Supabase query/insert, client types, ChiefPanel wiring, audit note), plus a new reason-column migration.',
    riskLevel: "medium",
    testsOrChecksDone: [
      { label: "npm run qa (lint + tsc + build)", status: "pass" },
      { label: "Live-API / Supabase manual verification", status: "pending" },
    ],
    requestedAction:
      "Rebase onto main, run a live-API pass against a real Supabase instance, then open its own PR.",
    createdAt: "2026-07-04T06:42:40.000Z",
  },
];

export const REPO_CHANGE_APPROVAL_CARDS: ApprovalCard[] = PENDING_REPO_CHANGES.map(
  repoChangeApprovalToCard,
);
