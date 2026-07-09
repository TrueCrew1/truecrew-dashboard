/**
 * Future-agent entry contract.
 *
 * `AgentPacket` is the documented shape a future Research or Builder agent
 * will hand to Chief. This file defines that contract ONLY — it does not
 * implement any Research/Builder behavior, does not enqueue anything at
 * runtime, and adds no UI.
 *
 * Every packet must still route through Chief's shared approval path:
 * `createApprovalCardFromPacket()` maps a packet onto the existing
 * `*ApprovalRequest` / `ApprovalCard` shape via the helpers already in
 * `agentApprovalGates.ts`, and the resulting card must be enqueued via
 * `addCommandApproval()` on `ChiefApprovalsContext`. Chief is the only
 * approval surface and human-in-the-loop is mandatory — a packet is a
 * proposal, never an execution. See `docs/AGENT_APPROVAL_LOOPS.md`.
 */
import {
  createApprovalCardFromBuildRequest,
  createApprovalCardFromContentRequest,
  createApprovalCardFromPlannerRequest,
  createApprovalCardFromResearchRequest,
  type AgentApprovalRiskLevel,
  type AgentRole,
  type BuildApprovalGate,
} from "./agentApprovalGates";
import type { ApprovalCard, ApprovalChecklistItem } from "./types";

/**
 * The entry shape a future Research or Builder agent hands to Chief.
 *
 * The shared fields mirror `BaseAgentApprovalRequest`; the optional
 * role-specific fields carry the extra context each agent's request needs
 * (`filesOrAreas` for build, `alternativesConsidered` for research, etc.).
 * `gate` must be one of that agent's `APPROVAL_GATES` entries.
 */
export interface AgentPacket {
  /** Which agent produced this packet. */
  agent: AgentRole;
  id: string;
  gate: string;
  summary: string;
  riskLevel: AgentApprovalRiskLevel;
  /** Checks/tests the agent completed before proposing. */
  checksDone: ApprovalChecklistItem[];
  requestedAction: string;
  createdAt: string;
  /** Planner: roadmap phases the change touches. */
  affectedPhases?: string[];
  /** Build: files or areas the change touches. */
  filesOrAreas?: string[];
  /** Research: alternatives weighed before the recommendation. */
  alternativesConsidered?: string[];
  /** Content: who the copy is for. */
  audience?: "client" | "public";
}

/**
 * Pure mapper: convert an `AgentPacket` into an `ApprovalCard` using the
 * existing per-agent `createApprovalCardFrom*Request()` helpers. This does
 * not enqueue — callers must still pass the card through
 * `addCommandApproval()` (Chief-only, human-in-the-loop).
 */
export function createApprovalCardFromPacket(packet: AgentPacket): ApprovalCard {
  const shared = {
    id: packet.id,
    summary: packet.summary,
    riskLevel: packet.riskLevel,
    testsOrChecksDone: packet.checksDone,
    requestedAction: packet.requestedAction,
    createdAt: packet.createdAt,
  };

  switch (packet.agent) {
    case "planner":
      return createApprovalCardFromPlannerRequest({
        ...shared,
        gate: packet.gate,
        affectedPhases: packet.affectedPhases ?? [],
      });
    case "build":
      return createApprovalCardFromBuildRequest({
        ...shared,
        gate: packet.gate as BuildApprovalGate,
        filesOrAreas: packet.filesOrAreas ?? [],
      });
    case "research":
      return createApprovalCardFromResearchRequest({
        ...shared,
        gate: packet.gate,
        alternativesConsidered: packet.alternativesConsidered ?? [],
      });
    case "content":
      return createApprovalCardFromContentRequest({
        ...shared,
        gate: packet.gate,
        audience: packet.audience ?? "client",
      });
  }
}
