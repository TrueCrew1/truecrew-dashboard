/**
 * Chief governance events — client tier of the auditor system (ADR-001).
 *
 * @see docs/decisions/ADR-001-auditor-system.md
 *
 * `approval_proposal_created` and `approval_decision_recorded` events are for
 * history and inspection only. They are not authorization signals: they do not
 * approve, merge, deploy, or trigger agent work. Emit is best-effort; failures
 * are swallowed so approvals always proceed.
 */
import type { ApprovalAction } from "./types";

/** Observability-only — not authorization. Failures must never block approvals. */
export type ChiefGovernanceEventType =
  | "approval_proposal_created"
  | "approval_decision_recorded";

export type ChiefGovernanceAction = "created" | ApprovalAction;

export interface ChiefGovernanceEventBase {
  type: ChiefGovernanceEventType;
  proposalId: string;
  actor: string;
  action: ChiefGovernanceAction;
  timestamp: string;
  /** Reserved for future decision-reason capture; unset today. */
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

export type ChiefGovernanceEvent =
  | ChiefGovernanceProposalCreatedEvent
  | ChiefGovernanceDecisionRecordedEvent;

export type ChiefGovernanceEventListener = (event: ChiefGovernanceEvent) => void;

/** Max events retained by the dev Governance Events panel (in-memory only). */
export const CHIEF_GOVERNANCE_EVENT_LOG_LIMIT = 50;

const listeners = new Set<ChiefGovernanceEventListener>();

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

/** Best-effort emit — swallowed on failure so approvals always proceed. */
export function emitChiefGovernanceEvent(event: ChiefGovernanceEvent): void {
  try {
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
