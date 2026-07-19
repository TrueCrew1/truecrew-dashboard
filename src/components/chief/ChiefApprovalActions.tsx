import { Link } from "react-router-dom";
import {
  APPROVAL_ACTION_LABEL,
  type ApprovalActionState,
  approvalActionSuccessMessage,
  resolvedApprovalMessage,
} from "./chiefApproval";
import { ApprovalExecutionFeedbackLine } from "./ApprovalExecutionFeedbackLine";
import type { ApprovalExecutionFeedback } from "./approvalExecutionFeedback";
import type { ApprovalResultLink } from "./approvalResultLinks";
import type { ApprovalAction, ApprovalProposal } from "./types";

interface ChiefApprovalActionsProps {
  proposal: ApprovalProposal;
  actionState?: ApprovalActionState;
  executionFeedback?: ApprovalExecutionFeedback | null;
  resultLinks?: readonly ApprovalResultLink[];
  onAction: (proposalId: string, action: ApprovalAction) => void;
  variant: "board" | "card";
}

export function ChiefApprovalActions({
  proposal,
  actionState,
  executionFeedback,
  resultLinks = [],
  onAction,
  variant,
}: ChiefApprovalActionsProps) {
  const isLoading = actionState?.phase === "loading";
  const isSuccess = actionState?.phase === "success";
  const isError = actionState?.phase === "error";
  const activeAction = actionState?.action;

  if (proposal.status !== "pending") {
    const message =
      actionState?.phase === "success" && actionState.message
        ? actionState.message
        : resolvedApprovalMessage(proposal.status, {
            decidedAt: proposal.decidedAt,
            decidedBy: proposal.decidedBy,
          });

    return (
      <div className="chief-approval-result">
        <p
          className={`chief-approval-feedback chief-approval-feedback--resolved chief-approval-feedback--${proposal.status}`}
          aria-live="polite"
        >
          {message}
        </p>
        {executionFeedback ? (
          <ApprovalExecutionFeedbackLine
            feedback={executionFeedback}
            resultLinks={resultLinks}
          />
        ) : null}
      </div>
    );
  }

  if (isSuccess && activeAction) {
    return (
      <div className="chief-approval-result">
        <p
          className={`chief-approval-feedback chief-approval-feedback--success chief-approval-feedback--${activeAction}`}
          aria-live="polite"
        >
          {actionState?.message ?? approvalActionSuccessMessage(activeAction, proposal.routeLabel)}
        </p>
        {executionFeedback ? (
          <ApprovalExecutionFeedbackLine
            feedback={executionFeedback}
            resultLinks={resultLinks}
          />
        ) : null}
      </div>
    );
  }

  const actionClass =
    variant === "board" ? "chief-board-approval-actions" : "chief-approval-card-actions";

  return (
    <div className={actionClass}>
      {isError && actionState?.message ? (
        <p className="chief-approval-feedback chief-approval-feedback--error" aria-live="polite">
          {actionState.message}
        </p>
      ) : null}

      {executionFeedback ? <ApprovalExecutionFeedbackLine feedback={executionFeedback} resultLinks={resultLinks} /> : null}

      {proposal.routeTo ? (
        <Link
          to={proposal.routeTo}
          className={`chief-btn chief-btn-secondary${variant === "board" ? " chief-btn--compact" : ""}`}
        >
          {proposal.routeLabel ? `Open ${proposal.routeLabel}` : "View in dashboard"}
        </Link>
      ) : null}

      <button
        type="button"
        className={`chief-btn chief-btn-primary${variant === "board" ? " chief-btn--compact" : ""}`}
        disabled={isLoading}
        aria-busy={isLoading && activeAction === "approved"}
        onClick={() => onAction(proposal.id, "approved")}
      >
        {isLoading && activeAction === "approved"
          ? "Approving…"
          : APPROVAL_ACTION_LABEL.approved}
      </button>
      <button
        type="button"
        className={`chief-btn chief-btn-secondary${variant === "board" ? " chief-btn--compact" : ""}`}
        disabled={isLoading}
        aria-busy={isLoading && activeAction === "sent_back"}
        onClick={() => onAction(proposal.id, "sent_back")}
      >
        {isLoading && activeAction === "sent_back"
          ? "Sending back…"
          : APPROVAL_ACTION_LABEL.sent_back}
      </button>
      <button
        type="button"
        className={`chief-btn chief-btn-danger${variant === "board" ? " chief-btn--compact" : ""}`}
        disabled={isLoading}
        aria-busy={isLoading && activeAction === "rejected"}
        onClick={() => onAction(proposal.id, "rejected")}
      >
        {isLoading && activeAction === "rejected"
          ? "Rejecting…"
          : APPROVAL_ACTION_LABEL.rejected}
      </button>
    </div>
  );
}
