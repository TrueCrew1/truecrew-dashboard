import type { Persona } from "@/types";
import type { ApprovalAction, ApprovalRecommendedDecision, ApprovalSource, ApprovalStatus } from "./types";
import { formatChiefTimestamp } from "./chiefMock";

export type ApprovalActionPhase = "idle" | "loading" | "success" | "error";

export interface ApprovalActionState {
  phase: ApprovalActionPhase;
  action?: ApprovalAction;
  message?: string;
}

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  sent_back: "Sent back",
};

export const APPROVAL_STATUS_BADGE: Record<ApprovalStatus, string> = {
  pending: "badge-yellow",
  approved: "badge-green",
  rejected: "badge-red",
  sent_back: "badge-blue",
};

export const APPROVAL_STATUS_ORDER: Record<ApprovalStatus, number> = {
  pending: 0,
  sent_back: 1,
  approved: 2,
  rejected: 3,
};

export const APPROVAL_ACTION_LABEL: Record<ApprovalAction, string> = {
  approved: "Approve",
  rejected: "Reject",
  sent_back: "Send back",
};

export const APPROVAL_RECOMMENDED_DECISION_LABEL: Record<ApprovalRecommendedDecision, string> = {
  approve: "Recommend: Approve",
  hold: "Recommend: Hold",
  needs_changes: "Recommend: Needs changes",
};

export const APPROVAL_RECOMMENDED_DECISION_BADGE: Record<ApprovalRecommendedDecision, string> = {
  approve: "badge-green",
  hold: "badge-yellow",
  needs_changes: "badge-red",
};

export const APPROVAL_SOURCE_LABEL: Record<ApprovalSource, string> = {
  pr: "PR",
  agent_build: "Repo",
  ops_change: "Ops change",
  repo_change: "Repo",
  planner_agent: "Planner",
  research_agent: "Research",
  content_agent: "Content",
};

export const APPROVAL_SOURCE_BADGE: Record<ApprovalSource, string> = {
  pr: "badge-blue",
  agent_build: "badge-orange",
  ops_change: "badge-steel",
  repo_change: "badge-orange",
  planner_agent: "badge-blue",
  research_agent: "badge-steel",
  content_agent: "badge-orange",
};

export const APPROVAL_CHECKLIST_STATUS_ICON: Record<"pass" | "fail" | "pending", string> = {
  pass: "✓",
  fail: "✗",
  pending: "○",
};

export function approvalActionToStatus(action: ApprovalAction): ApprovalAction {
  return action;
}

export function resolvedApprovalMessage(
  status: ApprovalStatus,
  audit?: { decidedAt?: string; decidedBy?: Persona },
): string {
  let base: string;
  switch (status) {
    case "approved":
      base = "Approved — no further action required.";
      break;
    case "rejected":
      base = "Rejected — action will not proceed.";
      break;
    case "sent_back":
      base = "Sent back — specialist can revise and resubmit.";
      break;
    default:
      return "";
  }

  if (audit?.decidedAt) {
    const when = formatChiefTimestamp(audit.decidedAt);
    const decidedBy = audit.decidedBy;
    const who = decidedBy ? ` by ${decidedBy.charAt(0).toUpperCase()}${decidedBy.slice(1)}` : "";
    return `${base} Decided ${when}${who}.`;
  }

  return base;
}

export function approvalActionSuccessMessage(
  action: ApprovalAction,
  routeLabel?: string,
): string {
  switch (action) {
    case "approved":
      return routeLabel
        ? `Approved — open ${routeLabel} to complete the workflow step.`
        : "Approved — recorded on the approval board.";
    case "rejected":
      return "Rejected — proposal will not proceed.";
    case "sent_back":
      return "Sent back — returned to the proposing specialist for revision.";
  }
}

/** Brief delay so inline loading states are perceptible during client-side resolution. */
export const APPROVAL_ACTION_DELAY_MS = 280;
