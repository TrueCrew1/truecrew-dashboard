import { Link } from "react-router-dom";
import { Panel, PanelEmpty } from "@/components/ui";
import type { ApprovalAlert, ApprovalAlertSeverity } from "./approvalAlerts";
import { formatChiefTimestamp } from "./chiefMock";
import { useApprovalAlerts } from "./useApprovalAlerts";

const SEVERITY_LABEL: Record<ApprovalAlertSeverity, string> = {
  at_risk: "At risk",
  overdue: "Overdue",
};

const SEVERITY_BADGE: Record<ApprovalAlertSeverity, string> = {
  at_risk: "badge-yellow",
  overdue: "badge-red",
};

function ApprovalAlertRow({ alert }: { alert: ApprovalAlert }) {
  const content = (
    <>
      <div className="chief-board-card-header">
        <span className="chief-board-card-title">{alert.title}</span>
        <span className={`badge ${SEVERITY_BADGE[alert.severity]}`}>
          {SEVERITY_LABEL[alert.severity]}
        </span>
      </div>
      <p className="chief-board-card-detail">{alert.summary}</p>
      <footer className="chief-board-card-footer">
        {alert.routeLabel ? (
          <span className="chief-board-card-route">Open {alert.routeLabel}</span>
        ) : null}
        <time className="chief-board-card-time" dateTime={alert.pendingSince}>
          Pending since {formatChiefTimestamp(alert.pendingSince)}
        </time>
      </footer>
    </>
  );

  if (alert.routeTo) {
    return (
      <Link
        to={alert.routeTo}
        className={`chief-board-card chief-board-card--${alert.severity === "overdue" ? "critical" : "warn"}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={`chief-board-card chief-board-card--${alert.severity === "overdue" ? "critical" : "warn"}`}
    >
      {content}
    </div>
  );
}

export function ApprovalAlertsPanel() {
  const { alerts, loading, error } = useApprovalAlerts();

  const overdueCount = alerts.filter((alert) => alert.severity === "overdue").length;
  const atRiskCount = alerts.length - overdueCount;

  const countLabel =
    alerts.length > 0
      ? [
          overdueCount > 0 ? `${overdueCount} overdue` : null,
          atRiskCount > 0 ? `${atRiskCount} at risk` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : undefined;

  return (
    <Panel
      title="Approval alerts"
      action={countLabel ? <span className="chief-section-count">{countLabel}</span> : undefined}
    >
      {loading ? (
        <PanelEmpty
          emptyKey="approval-alerts-loading"
          title="Loading approval alerts…"
        />
      ) : error ? (
        <PanelEmpty
          emptyKey="approval-alerts-error"
          title="Couldn't load approval alerts"
          description={error}
        />
      ) : alerts.length === 0 ? (
        <PanelEmpty
          emptyKey="approval-alerts-empty"
          title="No approvals at risk"
          description="Pending approvals are all within the normal review window."
          variant="success"
        />
      ) : (
        <ul className="chief-board-list">
          {alerts.map((alert) => (
            <li key={alert.proposalId}>
              <ApprovalAlertRow alert={alert} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
