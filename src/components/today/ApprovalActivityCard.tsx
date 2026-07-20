import { useLocation, useNavigate } from "react-router-dom";
import { Panel, PanelEmpty } from "@/components/ui";
import { formatChiefTimestamp } from "@/components/chief/chiefMock";
import {
  APPROVAL_STATUS_BADGE,
  APPROVAL_STATUS_LABEL,
} from "@/components/chief/chiefApproval";
import {
  APPROVAL_ACTIVITY_LIVE_NOTE,
  APPROVAL_ACTIVITY_MOCK_MODE_NOTE,
} from "@/components/chief/approvalActivityHelpers";
import { useApprovalActivity } from "@/hooks/useApprovalActivity";
import { buildChiefApprovalDeepLink } from "@/lib/navigation/approvalActivityNavigation";

export function ApprovalActivityCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, loading, error, liveApi } = useApprovalActivity();

  const modeNote = liveApi ? APPROVAL_ACTIVITY_LIVE_NOTE : APPROVAL_ACTIVITY_MOCK_MODE_NOTE;

  return (
    <Panel title="Approval activity">
      <p className="cell-muted">{modeNote}</p>

      {error ? (
        <p className="cell-muted" role="alert">
          Could not load approval activity: {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="cell-muted" role="status">
          Loading approval activity…
        </p>
      ) : null}

      {!loading && items.length === 0 && !error ? (
        <PanelEmpty
          emptyKey="approval-activity"
          title="No governed approval activity"
          description="Project handoff, incident postmortem, and monitor platform approvals will appear here when queued or decided."
          variant="default"
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="approval-activity-list">
          {items.map((item) => (
            <li key={item.proposalId} className="approval-activity-list-item">
              <div className="approval-activity-list-main">
                <div className="approval-activity-list-heading">
                  <span className="approval-activity-list-title">{item.title}</span>
                  <span className={`badge ${APPROVAL_STATUS_BADGE[item.status]}`}>
                    {APPROVAL_STATUS_LABEL[item.status]}
                  </span>
                </div>
                <p className="approval-activity-list-summary">{item.summary}</p>
                <p className="approval-activity-list-meta">
                  <span className="approval-activity-kind">{item.kindLabel}</span>
                  <span aria-hidden="true"> · </span>
                  <span>
                    {item.isPending ? "Queued" : "Decided"}{" "}
                    {formatChiefTimestamp(item.sortAt)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                className="approval-activity-link"
                onClick={() =>
                  navigate(buildChiefApprovalDeepLink(item.proposalId, location.pathname))
                }
              >
                View in Chief
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
