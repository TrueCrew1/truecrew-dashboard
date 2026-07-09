/**
 * Structured logging for Chief's intake → routing → approval path.
 *
 * There is no shared logging util in this repo and no `console.*` usage in
 * `src/`, so this stays deliberately small: every event is a plain, typed,
 * structured object that is buffered in-module (see `getChiefLogEntries`)
 * AND emitted via `console.info` under a stable `[chief]` prefix. It is
 * side-effect-light and SSR/test-safe (guards `console`), and does NOT
 * persist anything to a backend — buffered entries are session-scoped.
 *
 * Wired only into the existing intake/routing/approval points (ChiefPanel,
 * ChiefHomePanel, ChiefApprovalsContext); it never changes behavior.
 */
import type { ApprovalAction, ChiefSpecialist } from "./types";

/** Which text-intake surface a command came in on. */
export type ChiefIntakeSurface = "dashboard" | "sidebar";

/** A command was received on one of Chief's intake surfaces. */
export interface ChiefIntakeEvent {
  kind: "intake";
  at: string;
  surface: ChiefIntakeSurface;
  command: string;
}

/** What `resolveChiefCommand` produced for a submitted command. */
export interface ChiefRoutingEvent {
  kind: "routing";
  at: string;
  surface: ChiefIntakeSurface;
  routedTo: ChiefSpecialist;
  approvalNeeded: boolean;
}

/** A proposal was enqueued onto the shared approval queue. */
export interface ChiefApprovalEnqueuedEvent {
  kind: "approval";
  at: string;
  phase: "enqueued";
  surface: ChiefIntakeSurface;
  proposalId: string;
  title: string;
}

/** An operator decision was recorded against a proposal. */
export interface ChiefApprovalDecisionEvent {
  kind: "approval";
  at: string;
  phase: "decision";
  proposalId: string;
  action: ApprovalAction;
}

export type ChiefApprovalEvent = ChiefApprovalEnqueuedEvent | ChiefApprovalDecisionEvent;

export type ChiefLogEvent = ChiefIntakeEvent | ChiefRoutingEvent | ChiefApprovalEvent;

/** Distributive `Omit` so the discriminated union is preserved. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Callers pass everything but `at`; `logChiefEvent` stamps the timestamp. */
export type ChiefLogEventInput = DistributiveOmit<ChiefLogEvent, "at">;

const LOG_PREFIX = "[chief]";

const entries: ChiefLogEvent[] = [];

/**
 * Record a Chief event: buffer it in-module and emit it via `console.info`
 * with the `[chief]` prefix. The `at` timestamp is stamped here so call
 * sites only supply the meaningful fields. Returns the stored entry.
 */
export function logChiefEvent(event: ChiefLogEventInput): ChiefLogEvent {
  const entry = { ...event, at: new Date().toISOString() } as ChiefLogEvent;
  entries.push(entry);
  if (typeof console !== "undefined" && typeof console.info === "function") {
    console.info(LOG_PREFIX, entry.kind, entry);
  }
  return entry;
}

/** Read-only view of the buffered entries (session-scoped, in-memory). */
export function getChiefLogEntries(): readonly ChiefLogEvent[] {
  return entries;
}

/** Clear the in-memory buffer (test/dev convenience). */
export function clearChiefLogEntries(): void {
  entries.length = 0;
}
