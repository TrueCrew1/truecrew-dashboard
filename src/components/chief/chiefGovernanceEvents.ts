/**
 * Chief governance events — client tier of the auditor system (ADR-001).
 *
 * @see docs/decisions/ADR-001-auditor-system.md
 *
 * `approval_proposal_created`, `approval_decision_recorded`, and
 * `task_reprioritized` events are for history and inspection only. They are
 * not authorization signals: they do not approve, merge, deploy, or trigger
 * agent work. Emit is best-effort; failures are swallowed so approvals and
 * board rendering always proceed.
 */
import { loadSessionState, saveSessionState } from "./chiefSessionStorage";
import type { ApprovalAction } from "./types";
// Sanctioned barrel, not a direct import of taskTimeResearch.ts — see
// docs/AGENT_RUNBOOK.md § Knowledge Precedence & Task-Time Retrieval.
import type { TaskTimeResearchStatus } from "@/lib/knowledge/index";

/** Observability-only — not authorization. Failures must never block approvals. */
export type ChiefGovernanceEventType =
  | "approval_proposal_created"
  | "approval_decision_recorded"
  | "task_reprioritized"
  | "research_integrity_checked";

export type ChiefGovernanceAction =
  | "created"
  | ApprovalAction
  | "reprioritized"
  | TaskTimeResearchStatus;

export interface ChiefGovernanceEventBase {
  type: ChiefGovernanceEventType;
  /**
   * Id of the entity this event is about — a proposal id, a task id (for
   * task_reprioritized), or a WorkStoryDefinition.id (for
   * research_integrity_checked).
   */
  proposalId: string;
  actor: string;
  action: ChiefGovernanceAction;
  timestamp: string;
  /** Reserved for future decision-reason capture; unset for approval events today. */
  rationale?: string;
}

export interface ChiefGovernanceProposalCreatedEvent extends ChiefGovernanceEventBase {
  type: "approval_proposal_created";
  action: "created";
}

export interface ChiefGovernanceDecisionRecordedEvent extends ChiefGovernanceEventBase {
  type: "approval_decision_recorded";
  action: ApprovalAction;
}

export interface ChiefGovernanceTaskReprioritizedEvent extends ChiefGovernanceEventBase {
  type: "task_reprioritized";
  action: "reprioritized";
}

/**
 * Logged whenever Chief resolves a Work Story's task-time research state
 * (docs/AGENT_RUNBOOK.md § Knowledge Precedence & Task-Time Retrieval) —
 * `action` is the resolved TaskTimeResearchStatus itself
 * (authoritative/provisional/unavailable), and `rationale` carries the
 * human-readable detail (see describeResearchForChief() in
 * taskTimeResearch.ts), so this session's Governance panel and Recent
 * Activity strip make it possible to tell, after the fact, whether a
 * decision that touched a given Work Story had authoritative research behind
 * it, only provisional research, or none at all.
 */
export interface ChiefGovernanceResearchIntegrityCheckedEvent extends ChiefGovernanceEventBase {
  type: "research_integrity_checked";
  action: TaskTimeResearchStatus;
}

export type ChiefGovernanceEvent =
  | ChiefGovernanceProposalCreatedEvent
  | ChiefGovernanceDecisionRecordedEvent
  | ChiefGovernanceTaskReprioritizedEvent
  | ChiefGovernanceResearchIntegrityCheckedEvent;

export type ChiefGovernanceEventListener = (event: ChiefGovernanceEvent) => void;

/** Max events retained by the dev Governance Events panel (in-memory only). */
export const CHIEF_GOVERNANCE_EVENT_LOG_LIMIT = 50;

const listeners = new Set<ChiefGovernanceEventListener>();

/** Bump the suffix if the persisted event shape ever changes incompatibly. */
const GOVERNANCE_EVENTS_STORAGE_KEY = "chief.governanceEvents.v1";

const GOVERNANCE_EVENT_TYPES: ReadonlySet<string> = new Set([
  "approval_proposal_created",
  "approval_decision_recorded",
  "task_reprioritized",
  "research_integrity_checked",
]);

function isChiefGovernanceEvent(value: unknown): value is ChiefGovernanceEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.type === "string" &&
    GOVERNANCE_EVENT_TYPES.has(event.type) &&
    typeof event.proposalId === "string" &&
    typeof event.actor === "string" &&
    typeof event.action === "string" &&
    typeof event.timestamp === "string" &&
    (event.rationale === undefined || typeof event.rationale === "string")
  );
}

function isChiefGovernanceEventArray(value: unknown): value is ChiefGovernanceEvent[] {
  return Array.isArray(value) && value.every(isChiefGovernanceEvent);
}

/**
 * Session-scoped buffer so a panel that mounts after an event fired can
 * still see it via getRecentChiefGovernanceEvents() — without this, an
 * event emitted before the dev Governance tab is opened is lost forever,
 * since listeners only receive events emitted while subscribed. Seeded from
 * localStorage on load so this history also survives a page reload.
 */
const recentEvents: ChiefGovernanceEvent[] = (
  loadSessionState(GOVERNANCE_EVENTS_STORAGE_KEY, isChiefGovernanceEventArray) ?? []
).slice(0, CHIEF_GOVERNANCE_EVENT_LOG_LIMIT);

/**
 * Subscribe to governance events (audit/observability). Returns unsubscribe.
 * Listeners must not trigger merges, file writes, or agent work — events are
 * not authorization signals.
 */
export function subscribeChiefGovernanceEvents(
  listener: ChiefGovernanceEventListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot of events emitted so far this session, newest first. Use to seed a panel's state on mount. */
export function getRecentChiefGovernanceEvents(): ChiefGovernanceEvent[] {
  return [...recentEvents];
}

/** Best-effort emit — swallowed on failure so approvals always proceed. */
export function emitChiefGovernanceEvent(event: ChiefGovernanceEvent): void {
  try {
    recentEvents.unshift(event);
    if (recentEvents.length > CHIEF_GOVERNANCE_EVENT_LOG_LIMIT) {
      recentEvents.length = CHIEF_GOVERNANCE_EVENT_LOG_LIMIT;
    }
    saveSessionState(GOVERNANCE_EVENTS_STORAGE_KEY, recentEvents);

    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.debug("[chief-governance] listener error", error);
      }
    }
  } catch (error) {
    console.debug("[chief-governance] emit error", error);
  }
}

export function emitApprovalProposalCreated(
  proposalId: string,
  timestamp: string = new Date().toISOString(),
): void {
  emitChiefGovernanceEvent({
    type: "approval_proposal_created",
    proposalId,
    actor: "unknown",
    action: "created",
    timestamp,
  });
}

export function emitApprovalDecisionRecorded(
  proposalId: string,
  action: ApprovalAction,
  actor: string | null | undefined,
  decidedAt: string,
  rationale?: string,
): void {
  emitChiefGovernanceEvent({
    type: "approval_decision_recorded",
    proposalId,
    actor: actor ?? "unknown",
    action,
    timestamp: decidedAt,
    ...(rationale !== undefined ? { rationale } : {}),
  });
}

/** Logged once per task when the overdue-work reprioritization rule promotes it. */
export function emitTaskReprioritized(
  taskId: string,
  rationale: string,
  timestamp: string = new Date().toISOString(),
): void {
  emitChiefGovernanceEvent({
    type: "task_reprioritized",
    proposalId: taskId,
    actor: "Chief",
    action: "reprioritized",
    timestamp,
    rationale,
  });
}

/**
 * Logged whenever a Work Story's task-time research gate is resolved for
 * display (see `resolveTaskTimeResearch()` in taskTimeResearch.ts, called
 * from `WorkStoryPanel` in AgentWorkBoard.tsx) — the session record of
 * whether a Work Story had authoritative research behind it, only
 * provisional research, or none at all. `rationale` should be the same
 * human-readable detail already shown to the operator (e.g.
 * `describeResearchForChief(result).detail`), not a separate summary.
 */
export function emitResearchIntegrityChecked(
  workStoryId: string,
  status: TaskTimeResearchStatus,
  rationale: string,
  timestamp: string = new Date().toISOString(),
): void {
  emitChiefGovernanceEvent({
    type: "research_integrity_checked",
    proposalId: workStoryId,
    actor: "Chief",
    action: status,
    timestamp,
    rationale,
  });
}
