import type { Incident, Task } from "@/types";
import {
  deriveAgentAwaitingApprovalWorkItems,
  deriveBuildAgentWorkItems,
  deriveLibrarianAgentWorkItems,
  derivePlannerAgentWorkItems,
  deriveResearchAgentWorkItems,
  deriveWorkflowGateAgentWorkItems,
} from "./chiefLiveContext";
import { AGENT_WORK_ITEMS } from "./agentWorkBoardMock";
import type { AgentWorkItem, ApprovalProposal } from "./types";

/**
 * Every agent's current work, merged from the same live derivers and mock
 * data the Agents tab already uses. Single source of truth so the Timeline
 * tab and the detail drawer can show identical "current work" for an agent
 * regardless of which tab opened it.
 */
export function combineAgentWorkItems(input: {
  tasks: Task[];
  incidents: Incident[];
  plannerWorkItems: Parameters<typeof derivePlannerAgentWorkItems>[0];
  librarianWorkItems: Parameters<typeof deriveLibrarianAgentWorkItems>[0];
  approvals: ApprovalProposal[];
  mockItems?: AgentWorkItem[];
}): AgentWorkItem[] {
  return [
    ...deriveBuildAgentWorkItems(input.tasks),
    ...deriveWorkflowGateAgentWorkItems(input.tasks),
    ...deriveResearchAgentWorkItems(input.incidents),
    ...deriveLibrarianAgentWorkItems(input.librarianWorkItems),
    ...derivePlannerAgentWorkItems(input.plannerWorkItems),
    ...deriveAgentAwaitingApprovalWorkItems(input.approvals),
    ...(input.mockItems ?? AGENT_WORK_ITEMS),
  ];
}
