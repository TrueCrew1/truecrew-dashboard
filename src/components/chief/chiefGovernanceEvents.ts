/**
 * Chief governance event bus — observability only. No event here is a
 * decision, an approval, or a trigger for downstream work; it is a record
 * that something happened. Best-effort and non-blocking: emit failures are
 * swallowed so logging can never block a packet, a card, or an approval.
 *
 * In-memory `Set<listener>` pub/sub, session-scoped (no persistence — a
 * page reload clears history). In v1 the dev Governance Events panel is the
 * only consumer; `chiefLog.ts` builds packet-specific logging on top of
 * this rather than replacing it.
 */

export type ChiefGovernanceEventType =
  | "packet_created"
  | "card_created"
  | "card_decided"
  | "task_reprioritized";

export interface ChiefGovernanceEvent {
  id: string;
  type: ChiefGovernanceEventType;
  summary: string;
  detail?: Record<string, unknown>;
  timestamp: string;
}

type ChiefGovernanceEventListener = (event: ChiefGovernanceEvent) => void;

const listeners = new Set<ChiefGovernanceEventListener>();

/** Bounded so the dev panel has recent history without growing unbounded within a session. */
const GOVERNANCE_EVENT_BUFFER_LIMIT = 200;
const recentEvents: ChiefGovernanceEvent[] = [];

/** Best-effort emit: never throws back into the caller, regardless of listener behavior. */
export function emitChiefGovernanceEvent(event: ChiefGovernanceEvent): void {
  try {
    recentEvents.push(event);
    if (recentEvents.length > GOVERNANCE_EVENT_BUFFER_LIMIT) {
      recentEvents.shift();
    }

    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // A broken listener (e.g. the dev panel) must never block or throw
        // back into the caller that triggered the event.
      }
    }
  } catch {
    // Observability must never block the action it's logging.
  }
}

/** Returns an unsubscribe function. */
export function subscribeToChiefGovernanceEvents(
  listener: ChiefGovernanceEventListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot of events emitted so far this session, oldest first. */
export function getRecentChiefGovernanceEvents(): ChiefGovernanceEvent[] {
  return [...recentEvents];
}
