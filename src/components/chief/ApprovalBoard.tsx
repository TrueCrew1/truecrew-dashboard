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
import {
  compareApprovalsByAge,
  getApprovalUrgencyBadge,
  OVERDUE_HOURS,
} from "./chiefApprovalUrgency";
import { deriveAgentAwaitingApprovalWorkItems } from "./chiefLiveContext";
import { formatChiefTimestamp } from "./chiefMock";
import type { OpenAgentsOptions } from "./ChiefApprovalsContext";
import type { ApprovalAction, ApprovalProposal } from "./types";
import type {
  RuntimeMaintenanceWorkItemClient,
  RuntimePlannerWorkItemClient,
  RuntimeWorkItemClient,
} from "@/types/runtime";

interface ApprovalBoardProps {
  proposals: ApprovalProposal[];
  approvalActionStates: Record<string, ApprovalActionState>;
  onApprovalAction: (id: string, action: ApprovalAction) => void;
  statusFilter?: ApprovalStatusFilter;
  onStatusFilterChange?: (filter: ApprovalStatusFilter) => void;
  focusProposalId?: string | null;
  onOpenAgents?: (options?: OpenAgentsOptions) => void;
  liveApi?: boolean;
  librarianWorkByProposalId?: Map<string, RuntimeWorkItemClient>;
  filingProposalId?: string | null;
  onFileDecisionToVault?: (proposal: ApprovalProposal) => void;
  maintenanceWorkByProposalId?: Map<string, RuntimeMaintenanceWorkItemClient>;
  filingMaintenanceProposalId?: string | null;
  onFileMaintenanceTask?: (proposal: ApprovalProposal) => void;
  plannerWorkByProposalId?: Map<string, RuntimePlannerWorkItemClient>;
  filingPlannerProposalId?: string | null;
  onFileDecisionToPlanner?: (proposal: ApprovalProposal) => void;
}

export function ApprovalBoard({
  proposals,
  approvalActionStates,
  onApprovalAction,
  statusFilter: statusFilterProp,
  onStatusFilterChange,
  focusProposalId,
  onOpenAgents,
  liveApi = false,
  librarianWorkByProposalId,
  filingProposalId,
  onFileDecisionToVault,
  maintenanceWorkByProposalId,
  filingMaintenanceProposalId,
  onFileMaintenanceTask,
  plannerWorkByProposalId,
  filingPlannerProposalId,
  onFileDecisionToPlanner,
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
        // Pending: stale-first, so the longest-waiting proposals surface at
        // the top. Decided proposals keep newest-first — not an aging signal.
        if (a.status === "pending" && b.status === "pending") {
          return compareApprovalsByAge(a, b);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [filteredProposals],
  );

  const agentLinkedProposalIds = useMemo(() => {
    const awaitingItems = deriveAgentAwaitingApprovalWorkItems(proposals);
    return new Set(
      awaitingItems.map((item) => item.id.replace(/^agentwork-awaiting-/, "")),
    );
  }, [proposals]);

  return (
    <div className="chief-approval-tab">
      <p className="chief-approval-note" role="note">
        Audit logging follows ADR-001 (observability-only auditor system). Logs are
        for history and inspection — they do not approve, merge, or deploy. Logging
        failures do not block approvals.
      </p>

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
            {sortedProposals.map((proposal) => {
              const urgencyBadge = getApprovalUrgencyBadge(proposal);
              const isFocused = focusProposalId === proposal.id;
              const showAgentLink =
                proposal.status === "pending" &&
                agentLinkedProposalIds.has(proposal.id) &&
                onOpenAgents;

              return (
                <article
                  key={proposal.id}
                  id={`approval-proposal-${proposal.id}`}
                  className={[
                    "chief-approval-card",
                    `chief-approval-card--${proposal.status}`,
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

                  {proposal.source || proposal.recommendedDecision || urgencyBadge ? (
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

                  {showAgentLink ? (
                    <button
                      type="button"
                      className="chief-approval-link"
                      onClick={() => onOpenAgents({ focusProposalId: proposal.id })}
                    >
                      View in Agents
                    </button>
                  ) : null}

                  {proposal.status === "approved" && liveApi && onFileDecisionToVault ? (
                    <div className="chief-approval-file-vault">
                      {(() => {
                        const librarianWork = librarianWorkByProposalId?.get(proposal.id);
                        const isFiling = filingProposalId === proposal.id;

                        if (librarianWork?.status === "completed") {
                          return (
                            <p className="chief-approval-file-vault-status" role="status">
                              Already filed
                              {librarianWork.latestObsidianPath
                                ? ` — ${librarianWork.latestObsidianPath}`
                                : ""}
                            </p>
                          );
                        }

                        if (
                          librarianWork?.status === "queued" ||
                          librarianWork?.status === "running"
                        ) {
                          return (
                            <p className="chief-approval-file-vault-status" role="status">
                              Queued for vault — run{" "}
                              <code className="cell-mono">npm run librarian:run</code> locally.
                            </p>
                          );
                        }

                        if (librarianWork?.status === "failed") {
                          return (
                            <>
                              <p className="chief-approval-file-vault-status chief-approval-file-vault-status--warn" role="status">
                                Filing failed — review and retry.
                              </p>
                              <button
                                type="button"
                                className="chief-approval-link"
                                disabled={isFiling}
                                onClick={() => onFileDecisionToVault(proposal)}
                              >
                                {isFiling ? "Queueing…" : "Retry file to vault"}
                              </button>
                            </>
                          );
                        }

                        return (
                          <button
                            type="button"
                            className="chief-approval-link"
                            disabled={isFiling}
                            onClick={() => onFileDecisionToVault(proposal)}
                          >
                            {isFiling ? "Queueing…" : "File to vault"}
                          </button>
                        );
                      })()}
                    </div>
                  ) : null}

                  {proposal.status === "approved" && liveApi && onFileMaintenanceTask ? (
                    <div className="chief-approval-file-vault">
                      {(() => {
                        const maintenanceWork = maintenanceWorkByProposalId?.get(proposal.id);
                        const isFiling = filingMaintenanceProposalId === proposal.id;

                        if (maintenanceWork?.status === "completed") {
                          return (
                            <p className="chief-approval-file-vault-status" role="status">
                              Already filed as maintenance task
                              {maintenanceWork.latestObsidianPath
                                ? ` — ${maintenanceWork.latestObsidianPath}`
                                : ""}
                            </p>
                          );
                        }

                        if (
                          maintenanceWork?.status === "queued" ||
                          maintenanceWork?.status === "running"
                        ) {
                          return (
                            <p className="chief-approval-file-vault-status" role="status">
                              Queued for maintenance — run{" "}
                              <code className="cell-mono">npm run maintenance:run</code> locally.
                            </p>
                          );
                        }

                        if (maintenanceWork?.status === "failed") {
                          return (
                            <>
                              <p className="chief-approval-file-vault-status chief-approval-file-vault-status--warn" role="status">
                                Maintenance filing failed — review and retry.
                              </p>
                              <button
                                type="button"
                                className="chief-approval-link"
                                disabled={isFiling}
                                onClick={() => onFileMaintenanceTask(proposal)}
                              >
                                {isFiling ? "Queueing…" : "Retry file as maintenance task"}
                              </button>
                            </>
                          );
                        }

                        return (
                          <button
                            type="button"
                            className="chief-approval-link"
                            disabled={isFiling}
                            onClick={() => onFileMaintenanceTask(proposal)}
                          >
                            {isFiling ? "Queueing…" : "File as maintenance task"}
                          </button>
                        );
                      })()}
                    </div>
                  ) : null}

                  {proposal.status === "approved" && liveApi && onFileDecisionToPlanner ? (
                    <div className="chief-approval-file-vault">
                      {(() => {
                        const plannerWork = plannerWorkByProposalId?.get(proposal.id);
                        const isFiling = filingPlannerProposalId === proposal.id;

                        if (plannerWork?.status === "completed") {
                          return (
                            <p className="chief-approval-file-vault-status" role="status">
                              Already filed as planner task
                              {plannerWork.latestObsidianPath
                                ? ` — ${plannerWork.latestObsidianPath}`
                                : ""}
                            </p>
                          );
                        }

                        if (
                          plannerWork?.status === "queued" ||
                          plannerWork?.status === "running"
                        ) {
                          return (
                            <p className="chief-approval-file-vault-status" role="status">
                              Queued for Planner — run{" "}
                              <code className="cell-mono">npm run planner:run</code> locally.
                            </p>
                          );
                        }

                        if (plannerWork?.status === "failed") {
                          return (
                            <>
                              <p className="chief-approval-file-vault-status chief-approval-file-vault-status--warn" role="status">
                                Planner filing failed — review and retry.
                              </p>
                              <button
                                type="button"
                                className="chief-approval-link"
                                disabled={isFiling}
                                onClick={() => onFileDecisionToPlanner(proposal)}
                              >
                                {isFiling ? "Queueing…" : "Retry file as Planner task"}
                              </button>
                            </>
                          );
                        }

                        return (
                          <button
                            type="button"
                            className="chief-approval-link"
                            disabled={isFiling}
                            onClick={() => onFileDecisionToPlanner(proposal)}
                          >
                            {isFiling ? "Queueing…" : "File as Planner task"}
                          </button>
                        );
                      })()}
                    </div>
                  ) : null}

                  <ChiefApprovalActions
                    proposal={proposal}
                    actionState={approvalActionStates[proposal.id]}
                    onAction={onApprovalAction}
                    variant="card"
                  />
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
