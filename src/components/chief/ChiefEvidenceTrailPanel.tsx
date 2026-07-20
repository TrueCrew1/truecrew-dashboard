import {
  evidenceTrailStatusLabel,
  formatEvidenceAvailability,
  type GovernedEvidenceTrail,
} from "@/lib/chief/governedEvidenceTrail";

interface ChiefEvidenceTrailPanelProps {
  trail: GovernedEvidenceTrail;
}

function statusTone(status: GovernedEvidenceTrail["status"]): string {
  switch (status) {
    case "complete":
      return "neutral";
    case "partial":
      return "warn";
    case "pending":
      return "info";
    case "unavailable":
      return "muted";
  }
}

export function ChiefEvidenceTrailPanel({ trail }: ChiefEvidenceTrailPanelProps) {
  return (
    <section
      className="chief-evidence-trail"
      aria-label="Governed work evidence trail"
      data-testid="chief-evidence-trail"
    >
      <header className="chief-evidence-trail-header">
        <h4 className="chief-evidence-trail-title">Evidence trail</h4>
        <span className={`chief-evidence-trail-pill chief-evidence-trail-pill--${statusTone(trail.status)}`}>
          {evidenceTrailStatusLabel(trail.status)}
        </span>
      </header>

      <p className="chief-evidence-trail-summary">
        <span className="chief-evidence-trail-label">Source</span>{" "}
        {trail.sourceKind} · {trail.sourceId}
      </p>

      <div className="chief-evidence-trail-grid">
        <div className="chief-evidence-trail-field">
          <span className="chief-evidence-trail-label">Approval</span>
          <span className="chief-evidence-trail-value">{trail.approvalStatus}</span>
          {trail.approvalDecidedAt ? (
            <span className="chief-evidence-trail-meta">{trail.approvalDecidedAt}</span>
          ) : null}
        </div>

        {trail.missionKind ? (
          <div className="chief-evidence-trail-field">
            <span className="chief-evidence-trail-label">Mission</span>
            <span className="chief-evidence-trail-value">
              {trail.missionState ?? "not recorded"}
            </span>
            <span className="chief-evidence-trail-meta">{trail.missionKind}</span>
          </div>
        ) : null}

        {trail.executionFeedback ? (
          <div className="chief-evidence-trail-field chief-evidence-trail-field--wide">
            <span className="chief-evidence-trail-label">Execution</span>
            <span className={`chief-evidence-trail-value chief-evidence-trail-value--${trail.executionFeedback.tone}`}>
              {trail.executionFeedback.message}
            </span>
          </div>
        ) : null}
      </div>

      <div className="chief-evidence-trail-section">
        <h5 className="chief-evidence-trail-section-title">Verification</h5>
        <ul className="chief-evidence-trail-list">
          {trail.verification.map((step) => (
            <li key={step.step} className="chief-evidence-trail-list-item">
              <span className="chief-evidence-trail-item-label">{step.step}</span>
              <span className="chief-evidence-trail-item-value">
                {step.outcome ?? formatEvidenceAvailability(step.availability)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="chief-evidence-trail-section">
        <h5 className="chief-evidence-trail-section-title">References</h5>
        {trail.references.length === 0 ? (
          <p className="chief-evidence-trail-empty">No durable references recorded.</p>
        ) : (
          <ul className="chief-evidence-trail-list">
            {trail.references.map((reference) => (
              <li key={`${reference.kind}-${reference.path}`} className="chief-evidence-trail-list-item">
                <span className="chief-evidence-trail-item-label">{reference.label}</span>
                <span className="chief-evidence-trail-item-value">
                  {formatEvidenceAvailability(reference.availability)} · {reference.path}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="chief-evidence-trail-section">
        <h5 className="chief-evidence-trail-section-title">Reporting</h5>
        <ul className="chief-evidence-trail-list">
          <li className="chief-evidence-trail-list-item">
            <span className="chief-evidence-trail-item-label">Daily turnover</span>
            <span className="chief-evidence-trail-item-value">
              {formatEvidenceAvailability(trail.reporting.turnover)}
            </span>
          </li>
          <li className="chief-evidence-trail-list-item">
            <span className="chief-evidence-trail-item-label">Builder report</span>
            <span className="chief-evidence-trail-item-value">
              {formatEvidenceAvailability(trail.reporting.builderReport)}
            </span>
          </li>
        </ul>
        {trail.reporting.detail ? (
          <p className="chief-evidence-trail-meta">{trail.reporting.detail}</p>
        ) : null}
      </div>

      {trail.warnings.length > 0 ? (
        <div className="chief-evidence-trail-section chief-evidence-trail-section--warn">
          <h5 className="chief-evidence-trail-section-title">Warnings</h5>
          <ul className="chief-evidence-trail-warnings">
            {trail.warnings.map((warning) => (
              <li key={warning.code}>{warning.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
