import { useEffect, useState } from "react";
import {
  getRecentChiefGovernanceEvents,
  subscribeChiefGovernanceEvents,
  type ChiefGovernanceEvent,
} from "./chiefGovernanceEvents";
import { formatChiefTimestamp } from "./chiefMock";

const RECENT_ACTIVITY_LIMIT = 5;

const ACTIVITY_TYPE_LABEL: Record<ChiefGovernanceEvent["type"], string> = {
  approval_proposal_created: "Proposal created",
  approval_decision_recorded: "Decision recorded",
  task_reprioritized: "Task reprioritized",
};

/** Prefers the human-readable rationale when present; falls back to action + id. */
function activityDetail(event: ChiefGovernanceEvent): string {
  if (event.rationale) return event.rationale;
  if (event.type === "approval_decision_recorded") {
    return `${event.action.replace(/_/g, " ")} — ${event.proposalId}`;
  }
  return event.proposalId;
}

/**
 * Compact recent-activity feed on Chief's main surface — sourced from the
 * same ADR-001 governance-event buffer (chiefGovernanceEvents.ts) as the dev
 * Governance panel, so the two never disagree about what happened.
 * Observability only: reflects history, not an authorization signal.
 */
export function RecentActivityStrip() {
  const [events, setEvents] = useState<ChiefGovernanceEvent[]>(() =>
    getRecentChiefGovernanceEvents().slice(0, RECENT_ACTIVITY_LIMIT),
  );

  useEffect(() => {
    return subscribeChiefGovernanceEvents((event) => {
      setEvents((prev) => [event, ...prev].slice(0, RECENT_ACTIVITY_LIMIT));
    });
  }, []);

  if (events.length === 0) return null;

  return (
    <section className="chief-recent-activity" aria-label="Recent Chief activity">
      <div className="chief-recent-activity-header">
        <h2 className="chief-recent-activity-title">Recent activity</h2>
      </div>
      <ul className="chief-recent-activity-list">
        {events.map((event, index) => (
          <li
            key={`${event.type}-${event.proposalId}-${event.timestamp}-${index}`}
            className="chief-recent-activity-item"
          >
            <span className="chief-recent-activity-type">{ACTIVITY_TYPE_LABEL[event.type]}</span>
            <span className="chief-recent-activity-detail">{activityDetail(event)}</span>
            <time className="chief-recent-activity-time" dateTime={event.timestamp}>
              {formatChiefTimestamp(event.timestamp)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
