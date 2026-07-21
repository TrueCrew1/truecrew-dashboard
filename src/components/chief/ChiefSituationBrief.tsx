import { Link } from "react-router-dom";
import { CHIEF_ROUTES } from "./chiefRoutes";
import type { PendingApprovalUrgencySummary } from "./chiefApprovalUrgency";
import type { ChiefLiveContext } from "./chiefLiveContext";
import { derivePlatformBriefSummary } from "./platformHealthSummary";
import type { PlatformHealthState } from "@/types/monitor";

interface ChiefSituationBriefProps {
  context: ChiefLiveContext;
  pendingApprovalCount: number;
  pendingUrgency?: PendingApprovalUrgencySummary;
  onOpenApprovals: () => void;
  /** Raw useMonitorHealth() state — same hook and endpoints Monitor uses. */
  platformHealth?: PlatformHealthState;
  /** Gates the platform-health line so mock-mode data is never shown as real. */
  liveApiEnabled?: boolean;
}

interface BriefMetric {
  key: string;
  label: string;
  count: number;
  tone: "neutral" | "warn" | "critical";
  sublabel?: string;
  action?: () => void;
  route?: string;
}

function formatPendingUrgencySublabel(summary: PendingApprovalUrgencySummary): string | undefined {
  if (summary.pending === 0) return undefined;

  const parts: string[] = [];
  if (summary.overdue > 0) {
    parts.push(`${summary.overdue} overdue`);
  }
  if (summary.dueSoon > 0) {
    parts.push(`${summary.dueSoon} due soon`);
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function ChiefSituationBrief({
  context,
  pendingApprovalCount,
  pendingUrgency,
  onOpenApprovals,
  platformHealth,
  liveApiEnabled,
}: ChiefSituationBriefProps) {
  const contextGapCount =
    context.tasksMissingCustomer.length + context.tasksMissingWorkflow.length;

  const platformSituation = derivePlatformBriefSummary(platformHealth, Boolean(liveApiEnabled));

  const urgencySublabel = pendingUrgency
    ? formatPendingUrgencySublabel(pendingUrgency)
    : undefined;

  const metrics: BriefMetric[] = [
    {
      key: "approvals",
      label: "Pending approvals",
      count: pendingApprovalCount,
      tone: pendingApprovalCount > 0 ? "critical" : "neutral",
      sublabel: urgencySublabel,
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
              {metric.sublabel ? (
                <span className="chief-brief-metric-sublabel">{metric.sublabel}</span>
              ) : null}
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

      {platformSituation.tone === "loading" ? null : (
        <p
          className={`chief-brief-footnote${
            platformSituation.tone === "issue"
              ? " chief-brief-footnote--issue"
              : platformSituation.tone === "healthy"
                ? " chief-brief-footnote--healthy"
                : ""
          }`}
          role="status"
        >
          {platformSituation.headline}
          {platformSituation.tone === "issue" ? (
            <>
              {" — "}
              <Link to={CHIEF_ROUTES.monitor} className="chief-brief-link">
                view on Monitor
              </Link>
            </>
          ) : null}
        </p>
      )}
    </section>
  );
}
