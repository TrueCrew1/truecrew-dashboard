import { useOperationalReadiness } from "@/hooks/useOperationalReadiness";
import {
  deriveOperationalStatusView,
  formatReadinessStatusLabel,
  OPERATIONAL_STATUS_DOC_REFERENCE,
  overallStatusHeadline,
  readinessStatusTone,
} from "@/lib/ops/operationalReadinessView";
import type { ReadinessStatus } from "@/lib/ops/operationalReadinessTypes";

function statusClassName(prefix: string, status: ReadinessStatus): string {
  return `${prefix} ${prefix}--${readinessStatusTone(status)}`;
}

export function ChiefOperationalStatusPanel() {
  const { summary, loading, error, liveApi, refresh } = useOperationalReadiness();
  const view = deriveOperationalStatusView({ liveApi, loading, error, summary });

  if (view.kind === "unavailable") {
    return (
      <section
        className="chief-ops-status"
        aria-label="Command Center operational status"
        data-testid="chief-ops-status"
      >
        <header className="chief-ops-status-header">
          <h3 className="chief-ops-status-title">Command Center status</h3>
          <span className={`chief-ops-status-pill chief-ops-status-pill--${view.tone}`}>
            Unavailable
          </span>
        </header>
        <p className="chief-ops-status-headline">{view.headline}</p>
        <p className="chief-ops-status-detail">{view.detail}</p>
        {liveApi ? (
          <button type="button" className="chief-ops-status-retry" onClick={() => void refresh()}>
            Retry
          </button>
        ) : null}
        <p className="chief-ops-status-footnote">Reference: {OPERATIONAL_STATUS_DOC_REFERENCE}</p>
      </section>
    );
  }

  const { summary: payload } = view;
  const overallTone = readinessStatusTone(payload.overallStatus);

  return (
    <section
      className="chief-ops-status"
      aria-label="Command Center operational status"
      data-testid="chief-ops-status"
    >
      <header className="chief-ops-status-header">
        <h3 className="chief-ops-status-title">Command Center status</h3>
        <span className={`chief-ops-status-pill chief-ops-status-pill--${overallTone}`}>
          {formatReadinessStatusLabel(payload.overallStatus)}
        </span>
      </header>

      <p className="chief-ops-status-headline">{overallStatusHeadline(payload.overallStatus)}</p>
      <p className="chief-ops-status-meta">
        Updated {new Date(payload.generatedAt).toLocaleString()}
      </p>

      <ul className="chief-ops-status-domains">
        {payload.domains.map((domain) => (
          <li key={domain.id} className="chief-ops-status-domain">
            <div className="chief-ops-status-domain-row">
              <span className="chief-ops-status-domain-label">{domain.label}</span>
              <span className={statusClassName("chief-ops-status-domain-status", domain.status)}>
                {formatReadinessStatusLabel(domain.status)}
              </span>
            </div>
            <p className="chief-ops-status-domain-summary">{domain.summary}</p>
          </li>
        ))}
      </ul>

      {payload.blockers.length > 0 ? (
        <div className="chief-ops-status-section chief-ops-status-section--critical">
          <h4 className="chief-ops-status-section-title">Blockers</h4>
          <ul className="chief-ops-status-list">
            {payload.blockers.map((item) => (
              <li key={`blocker-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {payload.warnings.length > 0 ? (
        <div className="chief-ops-status-section chief-ops-status-section--warn">
          <h4 className="chief-ops-status-section-title">Warnings</h4>
          <ul className="chief-ops-status-list">
            {payload.warnings.map((item) => (
              <li key={`warning-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {payload.partialOrNotWired.length > 0 ? (
        <div className="chief-ops-status-section">
          <h4 className="chief-ops-status-section-title">Partial / not wired</h4>
          <ul className="chief-ops-status-list">
            {payload.partialOrNotWired.map((item) => (
              <li key={`partial-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="chief-ops-status-footnote">Reference: {OPERATIONAL_STATUS_DOC_REFERENCE}</p>
    </section>
  );
}
