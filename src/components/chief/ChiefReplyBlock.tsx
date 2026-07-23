import type { ChiefResponse } from "./types";
import { formatChiefReplyLines } from "./chiefReplyFormat";

interface ChiefReplyBlockProps {
  response: ChiefResponse;
  /** Compact layout for the Today home panel intake. */
  variant?: "panel" | "home";
}

/**
 * Renders ChiefResponse in the canonical four-line operator format
 * (Status → Recommendation → Next action → Approval request).
 */
export function ChiefReplyBlock({ response, variant = "panel" }: ChiefReplyBlockProps) {
  const lines = formatChiefReplyLines(response);
  const rootClass =
    variant === "home" ? "chief-reply chief-reply--home" : "chief-reply chief-reply--panel";

  return (
    <div className={rootClass} aria-live="polite">
      <div className="chief-reply-line">
        <span className="chief-reply-label">Status</span>
        <p className="chief-reply-value">{lines.status}</p>
      </div>
      <div className="chief-reply-line">
        <span className="chief-reply-label">Recommendation</span>
        <p className="chief-reply-value">{lines.recommendation}</p>
      </div>
      <div className="chief-reply-line">
        <span className="chief-reply-label">Next action</span>
        <p className="chief-reply-value">{lines.nextAction}</p>
      </div>
      <div className="chief-reply-line">
        <span className="chief-reply-label">Approval request</span>
        <p className="chief-reply-value">{lines.approvalRequest}</p>
      </div>
    </div>
  );
}
