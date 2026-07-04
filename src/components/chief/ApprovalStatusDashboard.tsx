import { ApprovalSectionShell } from "./approvalWrappers";
import {
  APPROVAL_RECENT_DECISION_HOURS,
  APPROVAL_STALE_PENDING_HOURS,
  APPROVAL_STATUS_FILTER_LABEL,
  type ApprovalStatusFilter,
  type ApprovalStatusSummary,
} from "./approvalStatus";

interface StatusMetric {
  key: Exclude<ApprovalStatusFilter, "all">;
  count: number;
  tone: "neutral" | "warn" | "critical" | "clear";
}

interface ApprovalStatusDashboardProps {
  summary: ApprovalStatusSummary;
  activeFilter?: ApprovalStatusFilter;
  onFilterSelect?: (filter: ApprovalStatusFilter) => void;
}

export function ApprovalStatusDashboard({
  summary,
  activeFilter = "all",
  onFilterSelect,
}: ApprovalStatusDashboardProps) {
  const metrics: StatusMetric[] = [
    {
      key: "pending",
      count: summary.pending,
      tone: summary.pending > 0 ? "critical" : "clear",
    },
    {
      key: "approved",
      count: summary.approved,
      tone: summary.approved > 0 ? "neutral" : "clear",
    },
    {
      key: "returned",
      count: summary.returned,
      tone: summary.returned > 0 ? "warn" : "clear",
    },
    {
      key: "recent",
      count: summary.recentDecisions,
      tone: summary.recentDecisions > 0 ? "neutral" : "clear",
    },
  ];

  const queueStable = summary.pending === 0 && summary.total > 0;

  return (
    <ApprovalSectionShell
      className="chief-approval-status"
      title="Approval status"
      count={summary.total > 0 ? `${summary.total} total` : undefined}
      status={
        summary.total === 0 ? (
          <span className="chief-brief-status chief-brief-status--clear">No proposals</span>
        ) : queueStable ? (
          <span className="chief-brief-status chief-brief-status--clear">Queue clear</span>
        ) : null
      }
    >
      <div
        className="chief-approval-status-grid"
        role="group"
        aria-label="Approval status categories"
      >
        {metrics.map((metric) => {
          const isActive = activeFilter === metric.key;
          const className = [
            "chief-brief-metric",
            metric.tone !== "clear" && metric.tone !== "neutral"
              ? `chief-brief-metric--${metric.tone}`
              : "",
            isActive ? "chief-approval-status-metric--active" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const label = APPROVAL_STATUS_FILTER_LABEL[metric.key];
          const labelNode = (
            <span className="chief-brief-metric-label">
              {label}
              {metric.key === "pending" && summary.stalePending > 0 ? (
                <span className="badge-red chief-approval-stale-badge">
                  {summary.stalePending} stale
                </span>
              ) : null}
            </span>
          );

          if (onFilterSelect && metric.count > 0) {
            return (
              <button
                key={metric.key}
                type="button"
                className={className}
                aria-pressed={isActive}
                onClick={() => onFilterSelect(isActive ? "all" : metric.key)}
              >
                <span className="chief-brief-metric-count">{metric.count}</span>
                {labelNode}
              </button>
            );
          }

          return (
            <div
              key={metric.key}
              className={className}
              aria-disabled="true"
            >
              <span className="chief-brief-metric-count">{metric.count}</span>
              {labelNode}
            </div>
          );
        })}
      </div>

      {(summary.stalePending > 0 || summary.recentDecisions > 0 || (onFilterSelect && summary.total > 0)) ? (
        <p className="chief-approval-status-footnote">
          {summary.stalePending > 0
            ? `Stale = pending more than ${APPROVAL_STALE_PENDING_HOURS} hours. `
            : null}
          {summary.recentDecisions > 0
            ? `Recent = decided in the last ${APPROVAL_RECENT_DECISION_HOURS} hours. `
            : null}
          {onFilterSelect && summary.total > 0
            ? "Select a category to filter the approval board below."
            : null}
        </p>
      ) : null}
    </ApprovalSectionShell>
  );
}
