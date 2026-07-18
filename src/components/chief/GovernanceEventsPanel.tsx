import { useEffect, useState } from "react";
import { ApprovalSectionShell, ApprovalSurfaceEmpty } from "./approvalWrappers";
import { formatChiefTimestamp } from "./chiefMock";
import {
  getRecentChiefGovernanceEvents,
  subscribeToChiefGovernanceEvents,
  type ChiefGovernanceEvent,
} from "./chiefGovernanceEvents";

const EVENT_TYPE_LABEL: Record<ChiefGovernanceEvent["type"], string> = {
  packet_created: "Packet created",
  card_created: "Card created",
  card_decided: "Card decided",
  card_forwarded: "Card forwarded",
  card_returned_for_refinement: "Card returned",
  mission_queued: "Mission queued",
  mission_started: "Mission started",
  mission_completed: "Mission completed",
  mission_failed: "Mission failed",
  mission_retry_requested: "Mission retry requested",
  mission_reused_existing: "Mission reused (duplicate suppressed)",
  task_reprioritized: "Task reprioritized",
};

/**
 * Dev-only observability surface — the only consumer of chiefGovernanceEvents
 * in v1. Read-only and session-scoped: closing or reloading the tab clears
 * history, since events are never persisted.
 */
export function GovernanceEventsPanel() {
  const [events, setEvents] = useState<ChiefGovernanceEvent[]>(() =>
    getRecentChiefGovernanceEvents(),
  );

  useEffect(() => {
    return subscribeToChiefGovernanceEvents((event) => {
      setEvents((prev) => [event, ...prev]);
    });
  }, []);

  if (events.length === 0) {
    return (
      <ApprovalSurfaceEmpty
        lead="No governance events yet"
        description="Packet, card, and decision events logged this session will appear here as they happen."
      />
    );
  }

  return (
    <ApprovalSectionShell
      className="chief-history"
      title="Governance events"
      count={`${events.length} this session`}
    >
      <div className="chief-history-list">
        {events.map((event) => (
          <article key={event.id} className="chief-history-card">
            <div className="chief-history-card-header">
              <p className="chief-history-command">{EVENT_TYPE_LABEL[event.type]}</p>
              <span className="badge badge-steel">{event.type}</span>
            </div>
            <time className="chief-history-time" dateTime={event.timestamp}>
              {formatChiefTimestamp(event.timestamp)}
            </time>
            <p className="chief-history-result">{event.summary}</p>
          </article>
        ))}
      </div>
    </ApprovalSectionShell>
  );
}
