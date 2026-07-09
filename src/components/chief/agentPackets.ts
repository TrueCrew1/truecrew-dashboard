// AgentPacket — the entry contract future Research/Builder proposals MUST use.
// The full path is: Packet -> *ApprovalRequest -> createApprovalCardFrom*Request()
// -> ChiefApprovalsContext.addCommandApproval(). This file does NOT implement
// the actual producers (no Research/Builder packet emitters live here), and it
// must not create a parallel approval queue or any persistence: Chief remains
// the only approval surface, and human-in-the-loop stays mandatory. See
// docs/AGENT_APPROVAL_LOOPS.md ("System law", "Shared approval path").
import {
  createApprovalCardFromBuildRequest,
  createApprovalCardFromContentRequest,
  createApprovalCardFromPlannerRequest,
  createApprovalCardFromResearchRequest,
  type AgentRole,
  type BuildApprovalRequest,
  type ContentApprovalRequest,
  type PlannerApprovalRequest,
  type ResearchApprovalRequest,
} from "./agentApprovalGates";
import type { ApprovalCard } from "./types";

interface BaseAgentPacket {
  agent: AgentRole;
  /** Agent name/role that produced the packet, e.g. "ResearchAgent" / "BuilderAgent". */
  source: string;
  id?: string;
  createdAt?: string;
}

export type AgentPacket =
  | (BaseAgentPacket & { agent: "planner"; request: PlannerApprovalRequest })
  | (BaseAgentPacket & { agent: "build"; request: BuildApprovalRequest })
  | (BaseAgentPacket & { agent: "research"; request: ResearchApprovalRequest })
  | (BaseAgentPacket & { agent: "content"; request: ContentApprovalRequest });

export function createApprovalCardFromPacket(packet: AgentPacket): ApprovalCard {
  switch (packet.agent) {
    case "planner":
      return createApprovalCardFromPlannerRequest(packet.request);
    case "build":
      return createApprovalCardFromBuildRequest(packet.request);
    case "research":
      return createApprovalCardFromResearchRequest(packet.request);
    case "content":
      return createApprovalCardFromContentRequest(packet.request);
  }
}
