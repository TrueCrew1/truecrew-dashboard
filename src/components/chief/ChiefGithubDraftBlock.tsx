import type { ChiefGithubPrCommentDraft } from "./types";
import type { ChiefProjectToolMutationAudit } from "./chiefProjectToolMutation";
import { formatProjectToolMutationMessage } from "./chiefProjectToolMutation";

interface ChiefGithubDraftBlockProps {
  draft: ChiefGithubPrCommentDraft;
  variant?: "panel" | "home";
  /** Session mutation audit after approve → post (optional). */
  mutationAudit?: ChiefProjectToolMutationAudit | null;
  /** Linked approval status when known. */
  approvalStatus?: "pending" | "approved" | "rejected" | "sent_back";
}

function lifecyclePill(input: {
  approvalStatus?: ChiefGithubDraftBlockProps["approvalStatus"];
  mutationAudit?: ChiefProjectToolMutationAudit | null;
}): { label: string; className: string } {
  if (input.mutationAudit) {
    switch (input.mutationAudit.outcome) {
      case "executed":
        return { label: "Posted", className: "chief-tool-read-pill--executed" };
      case "skipped_offline":
        return { label: "Skipped (API off)", className: "chief-tool-read-pill--skipped" };
      case "failed":
        return { label: "Post failed", className: "chief-tool-read-pill--failed" };
      case "duplicate_skipped":
        return { label: "Duplicate skipped", className: "chief-tool-read-pill--duplicate" };
    }
  }
  if (input.approvalStatus === "approved") {
    return { label: "Approved", className: "chief-tool-read-pill--approved" };
  }
  if (input.approvalStatus === "rejected" || input.approvalStatus === "sent_back") {
    return { label: "Not posted", className: "chief-tool-read-pill--skipped" };
  }
  return { label: "Approval required", className: "chief-tool-read-pill--approval" };
}

/**
 * Scanable GitHub PR comment draft — source, project, PR target, preview,
 * and lifecycle badge. Does not post by itself.
 */
export function ChiefGithubDraftBlock({
  draft,
  variant = "panel",
  mutationAudit = null,
  approvalStatus,
}: ChiefGithubDraftBlockProps) {
  const rootClass =
    variant === "home"
      ? "chief-tool-read chief-tool-read--home chief-tool-read--github chief-tool-read--draft"
      : "chief-tool-read chief-tool-read--panel chief-tool-read--github chief-tool-read--draft";
  const target = `${draft.repo}#${draft.prNumber}`;
  const pill = lifecyclePill({ approvalStatus, mutationAudit });

  return (
    <section className={rootClass} aria-label="GitHub PR comment draft">
      <header className="chief-tool-read-meta">
        <span className="chief-tool-read-pill chief-tool-read-pill--source">GitHub</span>
        <span className="chief-tool-read-pill chief-tool-read-pill--project">
          {draft.projectName}
        </span>
        <span className="chief-tool-read-pill">PR comment draft</span>
        <span className={`chief-tool-read-pill ${pill.className}`}>{pill.label}</span>
      </header>

      <p className="chief-tool-read-scope">
        <span className="chief-tool-read-scope-label">Scope</span>
        {draft.repo}
      </p>

      <dl className="chief-obsidian-draft-fields">
        <div className="chief-obsidian-draft-field">
          <dt>PR target</dt>
          <dd>
            {draft.prUrl ? (
              <a href={draft.prUrl} target="_blank" rel="noreferrer">
                {target}
              </a>
            ) : (
              target
            )}{" "}
            — {draft.prTitle}
          </dd>
        </div>
      </dl>

      <div className="chief-obsidian-draft-preview">
        <span className="chief-tool-read-scope-label">Comment draft preview</span>
        <pre className="chief-obsidian-draft-preview-body">{draft.preview}</pre>
      </div>

      <p className="chief-tool-read-empty" role="status">
        {mutationAudit
          ? formatProjectToolMutationMessage(mutationAudit)
          : approvalStatus === "approved"
            ? "Approved — waiting for GitHub post result."
            : approvalStatus === "rejected" || approvalStatus === "sent_back"
              ? "Draft was not posted."
              : "Not posted to GitHub yet. Approve to post this comment on the selected project PR (no merge/close)."}
      </p>
    </section>
  );
}
