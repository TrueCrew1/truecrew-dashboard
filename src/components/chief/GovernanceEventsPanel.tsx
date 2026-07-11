import { useEffect, useState } from "react";
import { ApprovalSectionShell, ApprovalSurfaceEmpty } from "./approvalWrappers";
import { formatChiefTimestamp } from "./chiefMock";
import {
  CHIEF_GOVERNANCE_EVENT_LOG_LIMIT,
  subscribeChiefGovernanceEvents,
  type ChiefGovernanceEvent,
} from "./chiefGovernanceEvents";

const EVENT_TYPE_LABEL: Record<ChiefGovernanceEvent["type"], string> = {
  approval_proposal_created: "Proposal created",
  approval_decision_recorded: "Decision recorded",
};

function formatEventType(type: ChiefGovernanceEvent["type"]): string {
  return EVENT_TYPE_LABEL[type];
}

function formatAction(action: ChiefGovernanceEvent["action"]): string {
  return action.replace(/_/g, " ");
}

export function GovernanceEventsPanel() {
  const [events, setEvents] = useState<ChiefGovernanceEvent[]>([]);

  useEffect(() => {
    return subscribeChiefGovernanceEvents((event) => {
      setEvents((prev) => [event, ...prev].slice(0, CHIEF_GOVERNANCE_EVENT_LOG_LIMIT));
    });
  }, []);

  if (events.length === 0) {
    return (
      <ApprovalSurfaceEmpty
        lead="No governance events yet"
        description="Session inspector for ADR-001 auditor events (observability only — not control). Proposal and decision events appear here when you queue or decide on an Approvals card. They do not authorize merges, deploys, or agent work; logging failures do not block approvals."
      />
    );
  }

  return (
    <ApprovalSectionShell
      className="chief-governance"
      title="Governance events"
      count={`${events.length} recent`}
      status={
        <span className="chief-brief-status chief-brief-status--clear">Dev · read-only</span>
      }
    >
      <p className="chief-governance-note" role="note">
        ADR-001 auditor system — client tier. Inspect proposal and decision activity
        from this session. Observability only: events do not approve, merge, deploy,
        or trigger agent work. Logging failures do not block approvals.
      </p>

      <ul className="chief-governance-list" aria-label="Recent governance events">
        {events.map((event, index) => (
          <li key={`${event.type}-${event.proposalId}-${event.timestamp}-${index}`}>
            <article className="chief-governance-card">
              <div className="chief-governance-card-header">
                <span className="chief-governance-card-type">{formatEventType(event.type)}</span>
                <span className="badge badge-steel">{formatAction(event.action)}</span>
              </div>

              <dl className="chief-governance-meta">
                <div className="chief-governance-meta-row">
                  <dt>Proposal</dt>
                  <dd className="chief-governance-proposal-id" title={event.proposalId}>
                    {event.proposalId}
                  </dd>
                </div>
                <div className="chief-governance-meta-row">
                  <dt>Actor</dt>
                  <dd>{event.actor}</dd>
                </div>
                <div className="chief-governance-meta-row">
                  <dt>Time</dt>
                  <dd>
                    <time dateTime={event.timestamp}>{formatChiefTimestamp(event.timestamp)}</time>
                  </dd>
                </div>
                {event.rationale ? (
                  <div className="chief-governance-meta-row">
                    <dt>Rationale</dt>
                    <dd>{event.rationale}</dd>
                  </div>
                ) : null}
              </dl>
            </article>
          </li>
        ))}
      </ul>
    </ApprovalSectionShell>
  );
}
