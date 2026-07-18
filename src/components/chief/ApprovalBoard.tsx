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
import { BuildTestSuggestionHelper } from "./BuildTestSuggestionHelper";
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
import {
  compareApprovalsByAge,
  getApprovalUrgencyBadge,
  OVERDUE_HOURS,
  summarizePendingApprovalUrgency,
} from "./chiefApprovalUrgency";
import { formatChiefTimestamp } from "./chiefMock";
import type { ApprovalAction, ApprovalProposal } from "./types";

interface ApprovalBoardProps {
  proposals: ApprovalProposal[];
  approvalActionStates: Record<string, ApprovalActionState>;
  onApprovalAction: (id: string, action: ApprovalAction) => void;
  statusFilter?: ApprovalStatusFilter;
  onStatusFilterChange?: (filter: ApprovalStatusFilter) => void;
  focusProposalId?: string | null;
}

export function ApprovalBoard({
  proposals,
  approvalActionStates,
  onApprovalAction,
  statusFilter: statusFilterProp,
  onStatusFilterChange,
  focusProposalId,
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
  const resolvedCount = proposals.filter((p) => p.status !== "pending").length;
  // Same urgency tiers as the per-card badges (getApprovalUrgencyBadge) —
  // reused here at queue level instead of a separate ad hoc threshold.
  const urgencySummary = useMemo(
    () => summarizePendingApprovalUrgency(proposals),
    [proposals],
  );
  const auditEntries = buildApprovalAuditEntries(proposals);
  const sortedProposals = useMemo(
    () =>
      [...filteredProposals].sort((a, b) => {
        const statusDiff = APPROVAL_STATUS_ORDER[a.status] - APPROVAL_STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        // Pending: stale-first, so the longest-waiting proposals surface at
        // the top. Decided proposals keep newest-first — not an aging signal.
        if (a.status === "pending" && b.status === "pending") {
          return compareApprovalsByAge(a, b);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [filteredProposals],
  );

  // The single most urgent open item: first pending entry in the already
  // stale-first sorted list. Marked distinctly from the overdue badge so an
  // overdue-but-not-oldest item doesn't get confused for the top pick.
  const topPriorityProposalId = useMemo(
    () => sortedProposals.find((proposal) => proposal.status === "pending")?.id ?? null,
    [sortedProposals],
  );

  // First overdue card in stale-first order — target for the summary
  // strip's "Overdue" jump-to affordance.
  const firstOverdueProposalId = useMemo(
    () =>
      sortedProposals.find(
        (proposal) => getApprovalUrgencyBadge(proposal)?.urgency === "overdue",
      )?.id ?? null,
    [sortedProposals],
  );

  // First due-soon card in stale-first order — target for the summary
  // strip's "Due soon" jump-to affordance.
  const firstDueSoonProposalId = useMemo(
    () =>
      sortedProposals.find(
        (proposal) => getApprovalUrgencyBadge(proposal)?.urgency === "dueSoon",
      )?.id ?? null,
    [sortedProposals],
  );

  const handleJumpToOverdue = () => {
    if (!firstOverdueProposalId) return;
    document
      .getElementById(`approval-proposal-${firstOverdueProposalId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleJumpToDueSoon = () => {
    if (!firstDueSoonProposalId) return;
    document
      .getElementById(`approval-proposal-${firstDueSoonProposalId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleJumpToTopPriorityDecision = () => {
    if (!topPriorityProposalId) return;
    document
      .getElementById(`approval-decision-${topPriorityProposalId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Resets the board back to the standard pending queue after the operator
  // has jumped to an overdue or top-priority card — reuses the existing
  // status filter rather than a new pending-only view.
  const handleShowPendingQueue = () => {
    setStatusFilter("pending");
    document
      .querySelector(".chief-approval-board")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const approvalFooterStyle = {
    marginTop: 8,
    display: "flex",
    gap: 8,
    alignItems: "center",
    color: "var(--steel-dim)",
    fontSize: "0.92em",
  };

  return (
    <div className="chief-approval-tab">
      <p className="chief-approval-note" role="note">
        Audit logging is observability-only. Logs are for history and inspection —
        they do not approve, merge, or deploy. Logging failures do not block
        approvals.
      </p>

      <ApprovalStatusDashboard
        summary={statusSummary}
        activeFilter={statusFilter}
        onFilterSelect={setStatusFilter}
      />

      {proposals.length > 0 ? (
        <p className="chief-approval-note chief-approval-summary-strip" role="status">
          {pendingCount > 0 ? (
            <button
              type="button"
              className="chief-approval-summary-pending"
              onClick={handleShowPendingQueue}
              title="Return to the standard pending approvals queue."
            >
              Pending <strong>{pendingCount}</strong>
            </button>
          ) : (
            <>
              Pending <strong>{pendingCount}</strong>
            </>
          )}{" "}
          ·{" "}
          {urgencySummary.overdue > 0 ? (
            <button
              type="button"
              className="chief-approval-summary-overdue"
              onClick={handleJumpToOverdue}
              title="Scroll to the longest-waiting overdue approval."
            >
              Overdue <strong>{urgencySummary.overdue}</strong>
            </button>
          ) : (
            <>
              Overdue <strong>{urgencySummary.overdue}</strong>
            </>
          )}{" "}
          ·{" "}
          {urgencySummary.dueSoon > 0 ? (
            <button
              type="button"
              className="chief-approval-summary-duesoon"
              onClick={handleJumpToDueSoon}
              title="Scroll to the next due-soon approval."
            >
              Due soon <strong>{urgencySummary.dueSoon}</strong>
            </button>
          ) : (
            <>
              Due soon <strong>{urgencySummary.dueSoon}</strong>
            </>
          )}{" "}
          · Resolved <strong>{resolvedCount}</strong>
        </p>
      ) : null}

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
            {sortedProposals.map((proposal) => {
              const urgencyBadge = getApprovalUrgencyBadge(proposal);
              const isFocused = focusProposalId === proposal.id;
              const isTopPriority = proposal.id === topPriorityProposalId;
              const actionsNode = (
                <ChiefApprovalActions
                  proposal={proposal}
                  actionState={approvalActionStates[proposal.id]}
                  onAction={onApprovalAction}
                  variant="card"
                />
              );

              return (
                <article
                  key={proposal.id}
                  id={`approval-proposal-${proposal.id}`}
                  className={[
                    "chief-approval-card",
                    `chief-approval-card--${proposal.status}`,
                    urgencyBadge?.urgency === "overdue" ? "chief-approval-card--overdue" : "",
                    isFocused ? "chief-approval-card--focused" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="chief-approval-card-header">
                    <h3 className="chief-approval-card-title">{proposal.title}</h3>
                    <span className={`badge ${APPROVAL_STATUS_BADGE[proposal.status]}`}>
                      {APPROVAL_STATUS_LABEL[proposal.status]}
                    </span>
                  </div>

                  {proposal.source || proposal.recommendedDecision || urgencyBadge || isTopPriority ? (
                    <div className="chief-approval-card-tags">
                      {isTopPriority ? (
                        <button
                          type="button"
                          className="badge badge-orange chief-approval-badge--top-priority chief-approval-badge--clickable"
                          title="Chief's #1 pick — the longest-waiting pending approval. Click to jump to its decision."
                          onClick={handleJumpToTopPriorityDecision}
                        >
                          Top priority
                        </button>
                      ) : null}
                      {urgencyBadge ? (
                        <span
                          className={`badge ${urgencyBadge.badgeClass}`}
                          title={
                            urgencyBadge.escalate
                              ? `Pending ${OVERDUE_HOURS}h+ — consider escalating to the operator.`
                              : `Pending since ${formatChiefTimestamp(proposal.createdAt)}.`
                          }
                        >
                          {urgencyBadge.label}
                        </span>
                      ) : null}
                      {proposal.source ? (
                        <span className={`badge ${APPROVAL_SOURCE_BADGE[proposal.source]}`}>
                          {APPROVAL_SOURCE_LABEL[proposal.source]}
                        </span>
                      ) : null}
                      {proposal.recommendedDecision ? (
                        <span
                          className={`badge ${APPROVAL_RECOMMENDED_DECISION_BADGE[proposal.recommendedDecision]} chief-approval-badge--recommendation`}
                          title="Chief's suggested call — the operator's decision below is what actually counts."
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

                    <BuildTestSuggestionHelper proposal={proposal} />
                  </div>

                  <div
                    className="tc-approval-footer"
                    style={approvalFooterStyle}
                  >
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
                  </div>

                  {proposal.status === "pending" ? (
                    <div
                      id={`approval-decision-${proposal.id}`}
                      className="chief-approval-decision-zone"
                    >
                      <span className="chief-approval-decision-label">Decision required</span>
                      {actionsNode}
                    </div>
                  ) : (
                    actionsNode
                  )}
                </article>
              );
            })}
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
