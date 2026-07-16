import { Link } from "react-router-dom";
import { CHIEF_ROUTES } from "./chiefRoutes";
import { RecentActivityStrip } from "./RecentActivityStrip";
import type { ChiefLiveContext } from "./chiefLiveContext";

interface ChiefSituationBriefProps {
  context: ChiefLiveContext;
  pendingApprovalCount: number;
  onOpenApprovals: () => void;
}

interface BriefMetric {
  key: string;
  label: string;
  count: number;
  tone: "neutral" | "warn" | "critical";
  action?: () => void;
  route?: string;
}

export function ChiefSituationBrief({
  context,
  pendingApprovalCount,
  onOpenApprovals,
}: ChiefSituationBriefProps) {
  const contextGapCount =
    context.tasksMissingCustomer.length + context.tasksMissingWorkflow.length;

  const metrics: BriefMetric[] = [
    {
      key: "approvals",
      label: "Pending approvals",
      count: pendingApprovalCount,
      tone: pendingApprovalCount > 0 ? "critical" : "neutral",
      action: pendingApprovalCount > 0 ? onOpenApprovals : undefined,
    },
    {
      key: "blockers",
      label: "Blocked",
      count: context.blockingTasks.length,
      tone: context.blockingTasks.length > 0 ? "warn" : "neutral",
      route: CHIEF_ROUTES.builds,
    },
    {
      key: "focus",
      label: "At risk",
      count: context.focusItems.length,
      tone: context.focusItems.length > 0 ? "warn" : "neutral",
      route: CHIEF_ROUTES.today,
    },
    {
      key: "context",
      label: "Missing context",
      count: contextGapCount,
      tone: contextGapCount > 0 ? "warn" : "neutral",
      route: CHIEF_ROUTES.operations,
    },
    {
      key: "alerts",
      label: "Alerts",
      count: context.alerts.length,
      tone: context.alerts.some((a) => typeof a.severity === "number" && a.severity <= 2)
        ? "critical"
        : context.alerts.length > 0
          ? "warn"
          : "neutral",
      route: CHIEF_ROUTES.today,
    },
  ];

  const hasSignal = metrics.some((metric) => metric.count > 0);

  return (
    <section className="chief-brief" aria-label="Operational situation brief">
      <div className="chief-brief-header">
        <h2 className="chief-brief-title">Situation brief</h2>
        {!hasSignal ? (
          <span className="chief-brief-status chief-brief-status--clear">Queue stable</span>
        ) : null}
      </div>

      <div className="chief-brief-grid">
        {metrics.map((metric) => {
          const content = (
            <>
              <span className="chief-brief-metric-count">{metric.count}</span>
              <span className="chief-brief-metric-label">{metric.label}</span>
            </>
          );

          if (metric.action) {
            return (
              <button
                key={metric.key}
                type="button"
                className={`chief-brief-metric chief-brief-metric--${metric.tone}`}
                onClick={metric.action}
              >
                {content}
              </button>
            );
          }

          if (metric.route && metric.count > 0) {
            return (
              <Link
                key={metric.key}
                to={metric.route}
                className={`chief-brief-metric chief-brief-metric--${metric.tone}`}
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={metric.key}
              className={`chief-brief-metric chief-brief-metric--${metric.tone}`}
              aria-disabled="true"
            >
              {content}
            </div>
          );
        })}
      </div>

      {context.overdueTasks.length > 0 ? (
        <p className="chief-brief-footnote">
          {context.overdueTasks.length} overdue task
          {context.overdueTasks.length === 1 ? "" : "s"} —{" "}
          <Link to={CHIEF_ROUTES.operationsOverdue} className="chief-brief-link">
            view on Operations
          </Link>
        </p>
      ) : null}

      <RecentActivityStrip />
    </section>
  );
}
