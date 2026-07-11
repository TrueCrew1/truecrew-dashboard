import { useChiefApprovalAuditEvents } from "@/hooks/useChiefApprovalAuditEvents";
import type { ChiefApprovalAuditEvent } from "@/lib/api/chiefApprovalAudit";
import type { ApprovalAuditEntry } from "./approvalAudit";
import { ApprovalAuditTimeline } from "./ApprovalAuditTimeline";
import { ApprovalSectionShell } from "./approvalWrappers";
import { APPROVAL_STATUS_BADGE, APPROVAL_STATUS_LABEL } from "./chiefApproval";
import { formatChiefTimestamp } from "./chiefMock";

function toAuditEntry(event: ChiefApprovalAuditEvent): ApprovalAuditEntry {
  const status = event.status ?? "approved";
  return {
    id: event.id,
    action: status,
    actionLabel: APPROVAL_STATUS_LABEL[status],
    actorLabel: event.actor
      ? event.actor.charAt(0).toUpperCase() + event.actor.slice(1)
      : "Unknown actor",
    timestamp: formatChiefTimestamp(event.decidedAt),
    timestampIso: event.decidedAt,
    targetTitle: event.proposalId,
    contextLabel: "Durable audit_events record",
    note: null,
    badgeClass: APPROVAL_STATUS_BADGE[status],
  };
}

/**
 * Read-only view of server-persisted audit_events for Chief approval
 * decisions (entity_type "chief_approval_decision") — distinct from the
 * session-only, client-side Governance events above it. See ADR-001.
 */
export function ChiefApprovalAuditPanel() {
  const { events, isLoading, error } = useChiefApprovalAuditEvents();

  return (
    <ApprovalSectionShell
      className="chief-approval-audit"
      title="Approval audit (durable)"
      count={!isLoading && !error && events.length > 0 ? `${events.length} recent` : undefined}
    >
      <p className="chief-governance-note" role="note">
        Server-persisted <code className="cell-mono">audit_events</code> for Chief approval
        decisions — durable across sessions and reloads, distinct from the session-only
        Governance events above. Read-only: does not approve, merge, deploy, or trigger
        agent work.
      </p>

      {isLoading ? (
        <div className="chief-processing-card" aria-live="polite" aria-busy="true">
          <div className="chief-processing-header">
            <span className="chief-processing-dot" aria-hidden="true" />
            Loading approval audit events…
          </div>
          <div className="chief-processing-lines" aria-hidden="true">
            <span className="chief-skeleton-line chief-skeleton-line--long" />
            <span className="chief-skeleton-line chief-skeleton-line--medium" />
            <span className="chief-skeleton-line chief-skeleton-line--short" />
          </div>
        </div>
      ) : error ? (
        <div className="chief-section-empty" role="alert">
          <p className="chief-section-empty-lead">Couldn&apos;t load approval audit events</p>
          <p className="chief-section-empty-desc">{error}</p>
        </div>
      ) : (
        <ApprovalAuditTimeline
          entries={events.map(toAuditEntry)}
          emptyMessage="No durable approval audit events recorded yet."
        />
      )}
    </ApprovalSectionShell>
  );
}
