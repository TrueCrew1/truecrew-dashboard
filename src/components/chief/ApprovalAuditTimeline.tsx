import type { ApprovalAuditEntry } from "./approvalAudit";
import { ApprovalSurfaceEmpty } from "./approvalWrappers";

interface ApprovalAuditTimelineProps {
  entries: ApprovalAuditEntry[];
  emptyMessage?: string;
}

export function ApprovalAuditTimeline({
  entries,
  emptyMessage = "No approval decisions recorded yet.",
}: ApprovalAuditTimelineProps) {
  if (entries.length === 0) {
    return (
      <ApprovalSurfaceEmpty
        variant="audit"
        lead="Audit log empty"
        description={emptyMessage}
      />
    );
  }

  return (
    <section className="chief-audit-timeline" aria-label="Approval audit log">
      <ol className="chief-audit-list">
        {entries.map((entry) => (
          <li key={entry.id} className="chief-audit-item">
            <div className="chief-audit-item-marker" aria-hidden="true" />
            <article className="chief-audit-card">
              <header className="chief-audit-card-header">
                <span className={`badge ${entry.badgeClass}`}>{entry.actionLabel}</span>
                <time
                  className="chief-audit-card-time"
                  dateTime={entry.timestampIso ?? undefined}
                >
                  {entry.timestamp}
                </time>
              </header>

              <h3 className="chief-audit-card-target">{entry.targetTitle}</h3>

              <dl className="chief-audit-card-meta">
                <div className="chief-audit-meta-row">
                  <dt>Actor</dt>
                  <dd>{entry.actorLabel}</dd>
                </div>
                <div className="chief-audit-meta-row">
                  <dt>Context</dt>
                  <dd>{entry.contextLabel}</dd>
                </div>
              </dl>

              {entry.note ? (
                <p className="chief-audit-card-note">{entry.note}</p>
              ) : null}
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
