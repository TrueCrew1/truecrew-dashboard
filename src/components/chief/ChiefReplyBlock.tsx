import type { ChiefResponse, ApprovalStatus } from "./types";
import type { ChiefProjectToolMutationAudit } from "./chiefProjectToolMutation";
import { formatChiefReplyLines } from "./chiefReplyFormat";
import { ChiefToolReadBlock } from "./ChiefToolReadBlock";
import { ChiefObsidianDraftBlock } from "./ChiefObsidianDraftBlock";
import { ChiefGithubDraftBlock } from "./ChiefGithubDraftBlock";
import { ChiefResearchAssignmentBlock } from "./ChiefResearchAssignmentBlock";

interface ChiefReplyBlockProps {
  response: ChiefResponse;
  /** Compact layout for the Today home panel intake. */
  variant?: "panel" | "home";
  /** Linked approval lifecycle for draft blocks. */
  approvalStatus?: ApprovalStatus;
  mutationAudit?: ChiefProjectToolMutationAudit | null;
}

/**
 * Renders ChiefResponse in the canonical four-line operator format
 * (Status → Recommendation → Next action → Approval request), plus a
 * scanable tool-read, draft, or research assignment block when attached.
 */
export function ChiefReplyBlock({
  response,
  variant = "panel",
  approvalStatus,
  mutationAudit = null,
}: ChiefReplyBlockProps) {
  const lines = formatChiefReplyLines(response);
  const rootClass =
    variant === "home" ? "chief-reply chief-reply--home" : "chief-reply chief-reply--panel";

  return (
    <div className={rootClass} aria-live="polite">
      {response.researchAssignment ? (
        <ChiefResearchAssignmentBlock
          assignment={response.researchAssignment}
          variant={variant}
        />
      ) : response.obsidianNoteDraft ? (
        <ChiefObsidianDraftBlock
          draft={response.obsidianNoteDraft}
          variant={variant}
          approvalStatus={approvalStatus}
          mutationAudit={mutationAudit}
        />
      ) : response.githubPrCommentDraft ? (
        <ChiefGithubDraftBlock
          draft={response.githubPrCommentDraft}
          variant={variant}
          approvalStatus={approvalStatus}
          mutationAudit={mutationAudit}
        />
      ) : response.toolRead ? (
        <ChiefToolReadBlock toolRead={response.toolRead} variant={variant} />
      ) : null}
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
