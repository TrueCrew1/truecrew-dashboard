import { emitChiefGovernanceEvent } from "./chiefGovernanceEvents";
import type { AgentPacket, AgentPacketRequest } from "./agentPacket";
import type { BuilderMissionRecord } from "./builderMission";
import type { ApprovalAction, ApprovalCard, ApprovalMissingSignal, ChiefRoutingDisposition } from "./types";

/** Packet-observability logging. Extends chiefGovernanceEvents.ts — it does not replace it. */
export const chiefLog = {
  /** Logs that an agent wrapped a request as a packet. Not a card, not an approval. */
  packetCreated<TRequest extends AgentPacketRequest>(packet: AgentPacket<TRequest>): void {
    const agentLabel = packet.agent.charAt(0).toUpperCase() + packet.agent.slice(1);
    emitChiefGovernanceEvent({
      id: `evt-${packet.id}-created`,
      type: "packet_created",
      summary: `${agentLabel} packet queued: ${packet.request.gate}`,
      detail: { packetId: packet.id, agent: packet.agent, gate: packet.request.gate },
      timestamp: packet.createdAt,
    });
  },

  /** Logs that Chief turned a request into an ApprovalCard on the shared queue. */
  cardCreated(card: ApprovalCard): void {
    emitChiefGovernanceEvent({
      id: `evt-${card.id}-card-created`,
      type: "card_created",
      summary: `Card created: ${card.title}`,
      detail: {
        cardId: card.id,
        source: card.source,
        title: card.title,
        confidence: card.confidence,
      },
      timestamp: new Date().toISOString(),
    });
  },

  /** Logs that the operator decided a card via a Chief approval action. */
  cardDecided(card: ApprovalCard, action: ApprovalAction): void {
    emitChiefGovernanceEvent({
      id: `evt-${card.id}-card-decided-${action}`,
      type: "card_decided",
      summary: `Card decided (${action}): ${card.title}`,
      detail: { cardId: card.id, action, title: card.title, confidence: card.confidence },
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Logs that Chief forwarded a card for operator approval (confidence >= 0.9,
   * checklist passed, and — per the evidence-hardening rule — authoritative
   * evidence backing that confidence claim).
   */
  cardForwarded(
    card: ApprovalCard,
    confidence: number,
    reason: string,
    evidenceSummary: string,
  ): void {
    emitChiefGovernanceEvent({
      id: `evt-${card.id}-forwarded`,
      type: "card_forwarded",
      summary: `Card forwarded for approval (${(confidence * 100).toFixed(0)}%): ${card.title} — evidence: ${evidenceSummary}`,
      detail: {
        cardId: card.id,
        confidence,
        reason,
        source: card.source,
        evidenceSummary,
      },
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Logs that Chief returned a card for refinement (below confidence
   * threshold, checklist failed, or — per the evidence-hardening rule — a
   * >= 0.9 confidence claim with no authoritative evidence behind it).
   */
  cardReturnedForRefinement(
    card: ApprovalCard,
    confidence: number,
    missingSignals: ApprovalMissingSignal[],
    reason: string,
    evidenceSummary: string,
  ): void {
    const isHighConfidenceEvidenceGap = missingSignals.includes("high_confidence_without_evidence");
    emitChiefGovernanceEvent({
      id: `evt-${card.id}-returned`,
      type: "card_returned_for_refinement",
      summary: isHighConfidenceEvidenceGap
        ? `High-confidence proposal returned due to missing evidence (${(confidence * 100).toFixed(0)}%): ${card.title}`
        : `Card returned for refinement (${(confidence * 100).toFixed(0)}%): ${card.title}`,
      detail: {
        cardId: card.id,
        confidence,
        missingSignals,
        reason,
        source: card.source,
        evidenceSummary,
      },
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Logs a routing decision (forwarded or returned) for a card.
   */
  cardRouted(
    card: ApprovalCard,
    disposition: ChiefRoutingDisposition,
    confidence: number,
    reason: string,
    missingSignals: ApprovalMissingSignal[],
    evidenceSummary: string,
  ): void {
    if (disposition === "forwarded") {
      this.cardForwarded(card, confidence, reason, evidenceSummary);
    } else {
      this.cardReturnedForRefinement(card, confidence, missingSignals, reason, evidenceSummary);
    }
  },

  /** Logs that the overdue-work reprioritization rule promoted a task to the top of At-risk work. */
  taskReprioritized(taskId: string, rationale: string, timestamp: string = new Date().toISOString()): void {
    emitChiefGovernanceEvent({
      id: `evt-task-${taskId}-reprioritized-${timestamp}`,
      type: "task_reprioritized",
      summary: rationale,
      detail: { taskId },
      timestamp,
    });
  },

  /** Logs Builder mission lifecycle transitions (queued → started → completed|failed). */
  missionLifecycle(record: BuilderMissionRecord, phase: "queued" | "started" | "completed" | "failed"): void {
    const type =
      phase === "queued"
        ? "mission_queued"
        : phase === "started"
          ? "mission_started"
          : phase === "completed"
            ? "mission_completed"
            : "mission_failed";

    const { mission } = record;
    emitChiefGovernanceEvent({
      id: `evt-${mission.missionId}-${phase}-a${record.attempt}-${record.updatedAt}`,
      type,
      summary:
        phase === "queued"
          ? `Builder mission queued (attempt ${record.attempt}): ${mission.objective}`
          : phase === "started"
            ? `Builder mission started (attempt ${record.attempt}): ${mission.objective}`
            : phase === "completed"
              ? `Builder mission completed (attempt ${record.attempt}): ${record.result?.summary ?? mission.objective}`
              : `Builder mission failed (attempt ${record.attempt}): ${record.lastError ?? record.result?.artifacts?.failureReason ?? mission.objective}`,
      detail: {
        missionId: mission.missionId,
        workStoryId: mission.workStoryId,
        proposalId: mission.proposalId,
        status: record.status,
        attempt: record.attempt,
        evidenceSummary: mission.context?.evidenceSummary,
        resultSummary: record.result?.summary,
        failureReason: record.lastError ?? record.result?.artifacts?.failureReason,
        priorAttempts: record.previousResults.length,
      },
      timestamp: record.updatedAt,
    });
  },

  /** Operator explicitly requested another attempt after a failed mission. */
  missionRetryRequested(record: BuilderMissionRecord): void {
    const { mission } = record;
    emitChiefGovernanceEvent({
      id: `evt-${mission.missionId}-retry-a${record.attempt}-${record.updatedAt}`,
      type: "mission_retry_requested",
      summary: `Builder mission retry requested (attempt ${record.attempt}): ${mission.objective}`,
      detail: {
        missionId: mission.missionId,
        workStoryId: mission.workStoryId,
        proposalId: mission.proposalId,
        attempt: record.attempt,
        priorAttempts: record.previousResults.length,
      },
      timestamp: record.updatedAt,
    });
  },

  /** Duplicate launch suppressed — existing mission reused. */
  missionReusedExisting(
    record: BuilderMissionRecord,
    reason: "in_flight" | "already_completed" | "already_failed",
  ): void {
    const { mission } = record;
    const reasonLabel =
      reason === "in_flight"
        ? "already queued or running"
        : reason === "already_completed"
          ? "already completed"
          : "already failed (use Retry for another attempt)";
    emitChiefGovernanceEvent({
      id: `evt-${mission.missionId}-reused-${reason}-${record.updatedAt}`,
      type: "mission_reused_existing",
      summary: `Builder mission reused (${reasonLabel}): ${mission.objective}`,
      detail: {
        missionId: mission.missionId,
        workStoryId: mission.workStoryId,
        proposalId: mission.proposalId,
        status: record.status,
        attempt: record.attempt,
        reuseReason: reason,
      },
      timestamp: record.updatedAt,
    });
  },
};
