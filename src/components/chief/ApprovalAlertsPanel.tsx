import { useApprovalAlerts } from "./useApprovalAlerts";
import { APPROVAL_STATUS_BADGE, APPROVAL_STATUS_LABEL } from "./chiefApproval";
import { ApprovalSectionShell, ApprovalSurfaceEmpty } from "./approvalWrappers";

export function ApprovalAlertsPanel() {
  const { decisions, isLoading, error, refetch } = useApprovalAlerts();

  return (
    <ApprovalSectionShell
      className="chief-approval-alerts"
      title="Approval Alerts"
      count={!isLoading && !error && decisions.length > 0 ? `${decisions.length} total` : undefined}
    >
      {isLoading ? (
        <div className="chief-processing-card" aria-live="polite" aria-busy="true">
          <div className="chief-processing-header">
            <span className="chief-processing-dot" aria-hidden="true" />
            Loading approval alerts…
          </div>
          <div className="chief-processing-lines" aria-hidden="true">
            <span className="chief-skeleton-line chief-skeleton-line--long" />
            <span className="chief-skeleton-line chief-skeleton-line--medium" />
            <span className="chief-skeleton-line chief-skeleton-line--short" />
          </div>
        </div>
      ) : error ? (
        <div className="chief-section-empty" role="alert">
          <p className="chief-section-empty-lead">Couldn't load approval alerts</p>
          <p className="chief-section-empty-desc">{error}</p>
          <button type="button" className="chief-approval-filter-clear" onClick={refetch}>
            Retry
          </button>
        </div>
      ) : decisions.length === 0 ? (
        <ApprovalSurfaceEmpty lead="All caught up" description="No pending approvals." />
      ) : (
        <ol className="chief-audit-list" aria-label="Approval alerts">
          {decisions.map((decision) => (
            <li key={decision.proposalId} className="chief-audit-item">
              <div className="chief-audit-item-marker" aria-hidden="true" />
              <article className="chief-audit-card">
                <header className="chief-audit-card-header">
                  <span className={`badge ${APPROVAL_STATUS_BADGE[decision.status]}`}>
                    {APPROVAL_STATUS_LABEL[decision.status]}
                  </span>
                  <time className="chief-audit-card-time" dateTime={decision.decidedAt}>
                    {new Date(decision.decidedAt).toLocaleString()}
                  </time>
                </header>

                <h3 className="chief-audit-card-target">{decision.proposalId}</h3>

                <dl className="chief-audit-card-meta">
                  <div className="chief-audit-meta-row">
                    <dt>Actor</dt>
                    <dd>{decision.actor ?? "—"}</dd>
                  </div>
                </dl>
              </article>
            </li>
          ))}
        </ol>
      )}
    </ApprovalSectionShell>
  );
}
