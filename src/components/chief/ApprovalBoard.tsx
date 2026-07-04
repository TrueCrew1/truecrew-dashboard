import { useMemo, useState } from "react";
import { ApprovalAuditTimeline } from "./ApprovalAuditTimeline";
import { ApprovalStatusDashboard } from "./ApprovalStatusDashboard";
import { buildApprovalAuditEntries } from "./approvalAudit";
import {
  APPROVAL_STATUS_FILTER_LABEL,
  filterApprovalsByStatus,
  summarizeApprovalStatus,
  type ApprovalStatusFilter,
} from "./approvalStatus";
import {
  ApprovalHistoryShell,
  ApprovalSectionShell,
  ApprovalSurfaceEmpty,
} from "./approvalWrappers";
import { ChiefApprovalActions } from "./ChiefApprovalActions";
import {
  APPROVAL_CHECKLIST_STATUS_ICON,
  APPROVAL_RECOMMENDED_DECISION_BADGE,
  APPROVAL_RECOMMENDED_DECISION_LABEL,
  APPROVAL_SOURCE_BADGE,
  APPROVAL_SOURCE_LABEL,
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
  statusFilter?: ApprovalStatusFilter;
  onStatusFilterChange?: (filter: ApprovalStatusFilter) => void;
}

export function ApprovalBoard({
  proposals,
  approvalActionStates,
  onApprovalAction,
  statusFilter: statusFilterProp,
  onStatusFilterChange,
}: ApprovalBoardProps) {
  const [localStatusFilter, setLocalStatusFilter] = useState<ApprovalStatusFilter>("all");
  const statusFilter = statusFilterProp ?? localStatusFilter;
  const setStatusFilter = onStatusFilterChange ?? setLocalStatusFilter;

  const statusSummary = useMemo(() => summarizeApprovalStatus(proposals), [proposals]);
  const filteredProposals = useMemo(
    () => filterApprovalsByStatus(proposals, statusFilter),
    [proposals, statusFilter],
  );
  const pendingCount = proposals.filter((p) => p.status === "pending").length;
  const auditEntries = buildApprovalAuditEntries(proposals);
  const sortedProposals = useMemo(
    () =>
      [...filteredProposals].sort((a, b) => {
        const statusDiff = APPROVAL_STATUS_ORDER[a.status] - APPROVAL_STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [filteredProposals],
  );

  return (
    <div className="chief-approval-tab">
      <ApprovalStatusDashboard
        summary={statusSummary}
        activeFilter={statusFilter}
        onFilterSelect={setStatusFilter}
      />

      {proposals.length === 0 ? (
        <ApprovalSurfaceEmpty
          lead="No proposals"
          description="Chief will surface actions here when your approval is required."
        />
      ) : sortedProposals.length === 0 && statusFilter !== "all" ? (
        <div className="chief-approval-filter-empty">
          <ApprovalSurfaceEmpty
            lead={`No ${APPROVAL_STATUS_FILTER_LABEL[statusFilter].toLowerCase()} items`}
            description="Clear the category filter to see all proposals on the approval board."
          />
          <button
            type="button"
            className="chief-approval-filter-clear chief-approval-filter-clear--block"
            onClick={() => setStatusFilter("all")}
          >
            Clear category filter
          </button>
        </div>
      ) : (
        <ApprovalSectionShell
          className="chief-approval-board"
          title="Approval board"
          count={pendingCount > 0 ? `${pendingCount} pending` : undefined}
        >
          {statusFilter !== "all" ? (
            <div className="chief-approval-filter-banner" role="status">
              Filtered: {APPROVAL_STATUS_FILTER_LABEL[statusFilter]} ·{" "}
              <button
                type="button"
                className="chief-approval-filter-clear"
                onClick={() => setStatusFilter("all")}
              >
                Clear filter
              </button>
            </div>
          ) : null}

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

                {proposal.source || proposal.recommendedDecision ? (
                  <div className="chief-approval-card-tags">
                    {proposal.source ? (
                      <span className={`badge ${APPROVAL_SOURCE_BADGE[proposal.source]}`}>
                        {APPROVAL_SOURCE_LABEL[proposal.source]}
                      </span>
                    ) : null}
                    {proposal.recommendedDecision ? (
                      <span
                        className={`badge ${APPROVAL_RECOMMENDED_DECISION_BADGE[proposal.recommendedDecision]}`}
                      >
                        {APPROVAL_RECOMMENDED_DECISION_LABEL[proposal.recommendedDecision]}
                      </span>
                    ) : null}
                  </div>
                ) : null}

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

                  {proposal.checklist && proposal.checklist.length > 0 ? (
                    <div className="chief-approval-card-field">
                      <span className="chief-approval-card-label">Checklist</span>
                      <ul className="chief-approval-checklist">
                        {proposal.checklist.map((item) => (
                          <li
                            key={item.label}
                            className={`chief-approval-checklist-item chief-approval-checklist-item--${item.status}`}
                          >
                            <span aria-hidden="true">
                              {APPROVAL_CHECKLIST_STATUS_ICON[item.status]}
                            </span>
                            {item.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
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

          {auditEntries.length > 0 ? (
            <ApprovalHistoryShell
              title="Audit log"
              titleId="chief-approval-audit-title"
              count={`${auditEntries.length} recorded`}
            >
              <ApprovalAuditTimeline entries={auditEntries} />
            </ApprovalHistoryShell>
          ) : null}
        </ApprovalSectionShell>
      )}
    </div>
  );
}
