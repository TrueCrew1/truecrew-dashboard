import { Link } from "react-router-dom";
import {
  deriveApprovalActivityAction,
  selectRecentApprovalActivity,
} from "./approvalActivityAction";
import { requestChiefApprovalFocus } from "./chiefApprovalFocus";
import { APPROVAL_STATUS_BADGE, APPROVAL_STATUS_LABEL } from "./chiefApproval";
import { formatChiefTimestamp } from "./chiefMock";
import type { ApprovalProposal } from "./types";

interface ApprovalActivityCardProps {
  approvals: ApprovalProposal[];
}

/**
 * Compact "what got decided, and where did it come from" card for Today —
 * not a second approval board. Each item shows at most one action, derived
 * by deriveApprovalActivityAction() from the same routeTo/routeLabel/id
 * fields ApprovalBoard and ChiefBoard already render — no invented links.
 */
export function ApprovalActivityCard({ approvals }: ApprovalActivityCardProps) {
  const recent = selectRecentApprovalActivity(approvals);

  if (recent.length === 0) return null;

  return (
    <section className="chief-home-snapshot" aria-label="Recent approval activity">
      <header className="chief-home-snapshot-header">
        <h3 className="chief-home-snapshot-title">Approval activity</h3>
        <span className="chief-board-lane-count">{recent.length}</span>
      </header>
      <ul className="chief-approval-activity-list">
        {recent.map((proposal) => {
          const action = deriveApprovalActivityAction(proposal);
          return (
            <li key={proposal.id} className="chief-approval-activity-item">
              <div className="chief-approval-activity-main">
                <span className={`badge ${APPROVAL_STATUS_BADGE[proposal.status]}`}>
                  {APPROVAL_STATUS_LABEL[proposal.status]}
                </span>
                <span className="chief-approval-activity-title">{proposal.title}</span>
              </div>
              <div className="chief-approval-activity-meta">
                {proposal.decidedAt ? (
                  <time className="chief-approval-activity-time" dateTime={proposal.decidedAt}>
                    {formatChiefTimestamp(proposal.decidedAt)}
                  </time>
                ) : null}
                {action ? (
                  action.kind === "route" ? (
                    <Link to={action.href as string} className="chief-approval-activity-action">
                      {action.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="chief-approval-activity-action chief-approval-activity-action--button"
                      onClick={() => requestChiefApprovalFocus(action.proposalId as string)}
                    >
                      {action.label}
                    </button>
                  )
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
