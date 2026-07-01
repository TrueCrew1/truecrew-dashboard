import type { Persona } from "@/types";
import type { ApprovalAction, ApprovalStatus } from "./types";
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
