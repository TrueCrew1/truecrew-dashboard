import type {
  AgentRole,
  BuildApprovalRequest,
  ContentApprovalRequest,
  PlannerApprovalRequest,
  ResearchApprovalRequest,
} from "./agentApprovalGates";
import { chiefLog } from "./chiefLog";

export type AgentPacketRequest =
  | PlannerApprovalRequest
  | BuildApprovalRequest
  | ResearchApprovalRequest
  | ContentApprovalRequest;

/**
 * Pre-queue envelope an agent wraps its `*ApprovalRequest` in before Chief
 * turns it into an `ApprovalCard` (see `createApprovalCardFrom*Request()` in
 * agentApprovalGates.ts). Observability only: creating a packet does not
 * create a card, and a packet never reaches the operator directly — it
 * wraps the request, it does not compete with or replace it.
 */
export interface AgentPacket<TRequest extends AgentPacketRequest = AgentPacketRequest> {
  id: string;
  agent: AgentRole;
  request: TRequest;
  createdAt: string;
}

/** Wraps a request as a packet and logs its creation. Does not create a card or reach the operator. */
export function createAgentPacket<TRequest extends AgentPacketRequest>(
  agent: AgentRole,
  request: TRequest,
): AgentPacket<TRequest> {
  const packet: AgentPacket<TRequest> = {
    id: `packet-${agent}-${request.id}`,
    agent,
    request,
    createdAt: new Date().toISOString(),
  };

  chiefLog.packetCreated(packet);

  return packet;
}
