import { V2_PROGRAM_CARDS } from "@/data/v2Program";
import { getResearchRequests } from "@/lib/research/requests";
import { AGENT_WORK_ITEMS } from "@/components/chief/agentWorkBoardMock";
import type { MockData } from "@/data/mockData";
import type { AgentWorkItem, ApprovalProposal } from "@/components/chief/types";
import type { SearchDataContext } from "./types";

export function buildSearchDataContext(
  data: MockData,
  options?: {
    dataRail?: SearchDataContext["dataRail"];
    agentWork?: AgentWorkItem[];
    approvalCandidates?: ApprovalProposal[];
    researchRequests?: SearchDataContext["researchRequests"];
  },
): SearchDataContext {
  return {
    ...data,
    dataRail: options?.dataRail,
    programs: V2_PROGRAM_CARDS,
    agentWork: options?.agentWork ?? AGENT_WORK_ITEMS,
    researchRequests: options?.researchRequests ?? getResearchRequests(),
    approvalCandidates: options?.approvalCandidates,
  };
}
