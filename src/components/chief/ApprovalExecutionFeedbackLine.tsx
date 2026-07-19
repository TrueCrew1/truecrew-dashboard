import type { ApprovalExecutionFeedback } from "./approvalExecutionFeedback";
import type { ApprovalResultLink } from "./approvalResultLinks";
import { ApprovalResultLinksList } from "./ApprovalResultLinksList";

interface ApprovalExecutionFeedbackLineProps {
  feedback: ApprovalExecutionFeedback;
  resultLinks?: readonly ApprovalResultLink[];
}

export function ApprovalExecutionFeedbackLine({
  feedback,
  resultLinks = [],
}: ApprovalExecutionFeedbackLineProps) {
  return (
    <div className="chief-approval-execution-feedback-block">
      <p
        className={`chief-approval-execution-feedback chief-approval-execution-feedback--${feedback.tone}`}
        role="status"
      >
        {feedback.message}
      </p>
      <ApprovalResultLinksList links={resultLinks} />
    </div>
  );
}
