import { useEffect, useState } from "react";
import { formatChiefTimestamp } from "./chiefMock";
import {
  getRecentChiefGovernanceEvents,
  subscribeToChiefGovernanceEvents,
  type ChiefGovernanceEvent,
} from "./chiefGovernanceEvents";

const RECENT_ACTIVITY_LIMIT = 4;

function latestFirst(events: ChiefGovernanceEvent[]): ChiefGovernanceEvent[] {
  return events.slice(-RECENT_ACTIVITY_LIMIT).reverse();
}

/**
 * Compact, read-only recent-activity strip for the Chief situation brief —
 * shared by the sidebar Chief panel and the Today page's Chief home panel.
 * Observability only: never a decision, approval, or trigger, and renders
 * nothing when there's no session activity yet.
 */
export function RecentActivityStrip() {
  const [events, setEvents] = useState<ChiefGovernanceEvent[]>(() =>
    latestFirst(getRecentChiefGovernanceEvents()),
  );

  useEffect(() => {
    return subscribeToChiefGovernanceEvents((event) => {
      setEvents((prev) => [event, ...prev].slice(0, RECENT_ACTIVITY_LIMIT));
    });
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="chief-recent-activity" aria-label="Recent activity">
      <span className="chief-recent-activity-label">Recent activity</span>
      <ul className="chief-recent-activity-list">
        {events.map((event) => (
          <li key={event.id} className="chief-recent-activity-item">
            <span className="chief-recent-activity-summary">{event.summary}</span>
            <time className="chief-recent-activity-time" dateTime={event.timestamp}>
              {formatChiefTimestamp(event.timestamp)}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}
