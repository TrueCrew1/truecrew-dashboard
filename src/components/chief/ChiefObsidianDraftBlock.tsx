import type { ChiefObsidianNoteDraft } from "./types";
import type { ChiefProjectToolMutationAudit } from "./chiefProjectToolMutation";
import { formatProjectToolMutationMessage } from "./chiefProjectToolMutation";

interface ChiefObsidianDraftBlockProps {
  draft: ChiefObsidianNoteDraft;
  variant?: "panel" | "home";
  /** Session mutation audit after approve → write (optional). */
  mutationAudit?: ChiefProjectToolMutationAudit | null;
  /** Linked approval status when known. */
  approvalStatus?: "pending" | "approved" | "rejected" | "sent_back";
}

function lifecyclePill(input: {
  approvalStatus?: ChiefObsidianDraftBlockProps["approvalStatus"];
  mutationAudit?: ChiefProjectToolMutationAudit | null;
}): { label: string; className: string } {
  if (input.mutationAudit) {
    switch (input.mutationAudit.outcome) {
      case "executed":
        return { label: "Written", className: "chief-tool-read-pill--executed" };
      case "skipped_offline":
        return { label: "Skipped (API off)", className: "chief-tool-read-pill--skipped" };
      case "failed":
        return { label: "Write failed", className: "chief-tool-read-pill--failed" };
      case "duplicate_skipped":
        return { label: "Duplicate skipped", className: "chief-tool-read-pill--duplicate" };
    }
  }
  if (input.approvalStatus === "approved") {
    return { label: "Approved", className: "chief-tool-read-pill--approved" };
  }
  if (input.approvalStatus === "rejected" || input.approvalStatus === "sent_back") {
    return { label: "Not written", className: "chief-tool-read-pill--skipped" };
  }
  return { label: "Approval required", className: "chief-tool-read-pill--approval" };
}

/**
 * Scanable Obsidian note draft — source, project, target path, title,
 * preview, and lifecycle badge. Does not write by itself.
 */
export function ChiefObsidianDraftBlock({
  draft,
  variant = "panel",
  mutationAudit = null,
  approvalStatus,
}: ChiefObsidianDraftBlockProps) {
  const rootClass =
    variant === "home"
      ? "chief-tool-read chief-tool-read--home chief-tool-read--obsidian chief-tool-read--draft"
      : "chief-tool-read chief-tool-read--panel chief-tool-read--obsidian chief-tool-read--draft";
  const pill = lifecyclePill({ approvalStatus, mutationAudit });

  return (
    <section className={rootClass} aria-label="Obsidian note draft">
      <header className="chief-tool-read-meta">
        <span className="chief-tool-read-pill chief-tool-read-pill--source">Obsidian</span>
        <span className="chief-tool-read-pill chief-tool-read-pill--project">
          {draft.projectName}
        </span>
        <span className="chief-tool-read-pill">Note draft</span>
        <span className={`chief-tool-read-pill ${pill.className}`}>{pill.label}</span>
      </header>

      <p className="chief-tool-read-scope">
        <span className="chief-tool-read-scope-label">Scope</span>
        {draft.scopePrefix}
      </p>

      <dl className="chief-obsidian-draft-fields">
        <div className="chief-obsidian-draft-field">
          <dt>Title</dt>
          <dd>{draft.title}</dd>
        </div>
        <div className="chief-obsidian-draft-field">
          <dt>Target path</dt>
          <dd className="chief-obsidian-draft-path">{draft.targetPath}</dd>
        </div>
      </dl>

      <div className="chief-obsidian-draft-preview">
        <span className="chief-tool-read-scope-label">Draft preview</span>
        <pre className="chief-obsidian-draft-preview-body">{draft.preview}</pre>
      </div>

      <p className="chief-tool-read-empty" role="status">
        {mutationAudit
          ? formatProjectToolMutationMessage(mutationAudit)
          : approvalStatus === "approved"
            ? "Approved — waiting for vault write result."
            : approvalStatus === "rejected" || approvalStatus === "sent_back"
              ? "Draft was not written."
              : "Not written to the vault yet. Approve here or in Approvals to write under this project scope."}
      </p>
    </section>
  );
}
