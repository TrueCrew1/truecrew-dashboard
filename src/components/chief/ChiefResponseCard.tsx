import { SpecialistCards } from "./SpecialistCards";
import { formatChiefOperatorResponse } from "./chiefVoice";
import type { ChiefResponse } from "./types";

interface ChiefResponseCardProps {
  response: ChiefResponse;
  /** Compact layout for the Today home panel; full for the sidebar console. */
  variant?: "full" | "home";
  onOpenApprovals?: () => void;
}

/**
 * Fixed operator brief: Status → Recommendation → Next action → Approval request.
 * Specialists stay attribution-only below Chief's voice.
 */
export function ChiefResponseCard({
  response,
  variant = "full",
  onOpenApprovals,
}: ChiefResponseCardProps) {
  const view = formatChiefOperatorResponse(response);
  const rootClass =
    variant === "home" ? "chief-response-card chief-response-card--home" : "chief-response-card";

  return (
    <article className={rootClass} aria-label="Chief response">
      <div className="chief-response-section chief-response-section--chief">
        <div className="chief-speaker-row">
          <h3 className="chief-response-label">Chief</h3>
          <span className="chief-speaker-badge">Single voice</span>
        </div>
      </div>

      <div className="chief-response-section">
        <h3 className="chief-response-label">Status</h3>
        <p className="chief-response-text">{view.status}</p>
      </div>

      {view.blockers.length > 0 ? (
        <div className="chief-response-section">
          <h3 className="chief-response-label">Blockers</h3>
          <ul className="chief-blocker-list">
            {view.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="chief-response-section">
        <h3 className="chief-response-label">Recommendation</h3>
        <p className="chief-response-text chief-response-text--action">{view.recommendation}</p>
      </div>

      <div className="chief-response-section">
        <h3 className="chief-response-label">Next action</h3>
        <p className="chief-response-text chief-response-text--next">{view.nextAction}</p>
      </div>

      {view.approvalRequest ? (
        <div className="chief-response-section chief-approval">
          <div className="chief-approval-header">
            <h3 className="chief-response-label">Approval request</h3>
            <span className="chief-approval-badge">Required</span>
          </div>
          <p className="chief-response-text chief-approval-prompt">{view.approvalRequest.prompt}</p>
          {view.approvalRequest.riskNote ? (
            <p className="chief-approval-risk">{view.approvalRequest.riskNote}</p>
          ) : null}
          {view.approvalRequest.recommendation ? (
            <p className="chief-response-text">
              <strong>Recommendation:</strong> {view.approvalRequest.recommendation}
            </p>
          ) : null}
          {view.approvalRequest.riskLevel ? (
            <p className="chief-response-text">
              <strong>Risk level:</strong> {view.approvalRequest.riskLevel}
            </p>
          ) : null}
          {view.approvalRequest.rationale ? (
            <p className="chief-response-text">
              <strong>Rationale:</strong> {view.approvalRequest.rationale}
            </p>
          ) : null}
          {view.approvalRequest.evidence.length > 0 ? (
            <ul className="chief-blocker-list">
              {view.approvalRequest.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {view.approvalRequest.nextAction ? (
            <p className="chief-response-text">
              <strong>Next action:</strong> {view.approvalRequest.nextAction}
            </p>
          ) : null}
          {view.approvalRequest.improvementsMade.length > 0 ? (
            <p className="chief-response-text">
              <strong>Already filtered by Chief:</strong>{" "}
              {view.approvalRequest.improvementsMade.join("; ")}
            </p>
          ) : null}
          {onOpenApprovals ? (
            <button type="button" className="chief-approval-link" onClick={onOpenApprovals}>
              Open Approvals to review and decide
            </button>
          ) : (
            <p className="chief-home-response-approval">
              Needs approval — filed to the Chief panel&apos;s Approvals tab for review.
            </p>
          )}
        </div>
      ) : null}

      {response.specialists && response.specialists.length > 0 ? (
        <SpecialistCards specialists={response.specialists} />
      ) : null}
    </article>
  );
}
