import { emitChiefGovernanceEvent } from "./chiefGovernanceEvents";
import type { AgentPacket, AgentPacketRequest } from "./agentPacket";
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
   * checklist passed).
   */
  cardForwarded(
    card: ApprovalCard,
    confidence: number,
    reason: string,
  ): void {
    emitChiefGovernanceEvent({
      id: `evt-${card.id}-forwarded`,
      type: "card_forwarded",
      summary: `Card forwarded for approval (${(confidence * 100).toFixed(0)}%): ${card.title}`,
      detail: {
        cardId: card.id,
        confidence,
        reason,
        source: card.source,
      },
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Logs that Chief returned a card for refinement (below confidence threshold
   * or checklist failed).
   */
  cardReturnedForRefinement(
    card: ApprovalCard,
    confidence: number,
    missingSignals: ApprovalMissingSignal[],
    reason: string,
  ): void {
    emitChiefGovernanceEvent({
      id: `evt-${card.id}-returned`,
      type: "card_returned_for_refinement",
      summary: `Card returned for refinement (${(confidence * 100).toFixed(0)}%): ${card.title}`,
      detail: {
        cardId: card.id,
        confidence,
        missingSignals,
        reason,
        source: card.source,
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
    missingSignals?: ApprovalMissingSignal[],
  ): void {
    if (disposition === "forwarded") {
      this.cardForwarded(card, confidence, reason);
    } else {
      this.cardReturnedForRefinement(card, confidence, missingSignals ?? [], reason);
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
};
