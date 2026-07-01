import { ChiefApprovalActions } from "./ChiefApprovalActions";
import {
  APPROVAL_STATUS_BADGE,
  APPROVAL_STATUS_LABEL,
  APPROVAL_STATUS_ORDER,
  type ApprovalActionState,
} from "./chiefApproval";
import { formatChiefTimestamp } from "./chiefMock";
import type { ApprovalAction, ApprovalProposal } from "./types";

interface ApprovalBoardProps {
  proposals: ApprovalProposal[];
  approvalActionStates: Record<string, ApprovalActionState>;
  onApprovalAction: (id: string, action: ApprovalAction) => void;
}

export function ApprovalBoard({
  proposals,
  approvalActionStates,
  onApprovalAction,
}: ApprovalBoardProps) {
  const pendingCount = proposals.filter((p) => p.status === "pending").length;
  const sortedProposals = [...proposals].sort((a, b) => {
    const statusDiff = APPROVAL_STATUS_ORDER[a.status] - APPROVAL_STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (proposals.length === 0) {
    return (
      <div className="chief-section-empty">
        <p className="chief-section-empty-lead">No proposals</p>
        <p className="chief-section-empty-desc">
          Chief will surface actions here when your approval is required.
        </p>
      </div>
    );
  }

  return (
    <div className="chief-approval-board">
      <div className="chief-section-header">
        <h2 className="chief-section-title">Approval board</h2>
        {pendingCount > 0 ? (
          <span className="chief-section-count">{pendingCount} pending</span>
        ) : null}
      </div>

      <div className="chief-approval-list">
        {sortedProposals.map((proposal) => (
          <article
            key={proposal.id}
            className={`chief-approval-card chief-approval-card--${proposal.status}`}
          >
            <div className="chief-approval-card-header">
              <h3 className="chief-approval-card-title">{proposal.title}</h3>
              <span className={`badge ${APPROVAL_STATUS_BADGE[proposal.status]}`}>
                {APPROVAL_STATUS_LABEL[proposal.status]}
              </span>
            </div>

            <p className="chief-approval-card-summary">{proposal.summary}</p>

            <div className="chief-approval-card-details">
              <div className="chief-approval-card-field">
                <span className="chief-approval-card-label">Recommended</span>
                <p className="chief-approval-card-value">{proposal.recommendedAction}</p>
              </div>

              <div className="chief-approval-card-field chief-approval-card-field--risk">
                <span className="chief-approval-card-label">Risk / impact</span>
                <p className="chief-approval-card-value">{proposal.riskNote}</p>
              </div>
            </div>

            <footer
              className={`chief-approval-card-footer${proposal.specialist ? "" : " chief-approval-card-footer--solo"}`}
            >
              {proposal.specialist ? (
                <span className="chief-approval-card-meta">
                  <span className="chief-approval-card-meta-label">Via</span>
                  <span className="chief-approval-card-meta-value">{proposal.specialist}</span>
                </span>
              ) : null}
              <time className="chief-approval-card-time" dateTime={proposal.createdAt}>
                {formatChiefTimestamp(proposal.createdAt)}
              </time>
            </footer>

            <ChiefApprovalActions
              proposal={proposal}
              actionState={approvalActionStates[proposal.id]}
              onAction={onApprovalAction}
              variant="card"
            />
          </article>
        ))}
      </div>
    </div>
  );
}
