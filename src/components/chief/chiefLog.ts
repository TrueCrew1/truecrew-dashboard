import { emitChiefGovernanceEvent } from "./chiefGovernanceEvents";
import type { AgentPacket, AgentPacketRequest } from "./agentPacket";
import type { ApprovalAction, ApprovalCard } from "./types";

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
      detail: { cardId: card.id, source: card.source, title: card.title },
      timestamp: new Date().toISOString(),
    });
  },

  /** Logs that the operator decided a card via a Chief approval action. */
  cardDecided(card: ApprovalCard, action: ApprovalAction): void {
    emitChiefGovernanceEvent({
      id: `evt-${card.id}-card-decided-${action}`,
      type: "card_decided",
      summary: `Card decided (${action}): ${card.title}`,
      detail: { cardId: card.id, action, title: card.title },
      timestamp: new Date().toISOString(),
    });
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
