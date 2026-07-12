import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import {
  deriveAgentActivityTimeline,
  type AgentActivityItem,
} from "@/components/chief/agentActivityFeed";
import { combineAgentWorkItems } from "@/components/chief/agentWorkItems";
import { useChiefApprovals } from "@/components/chief/ChiefApprovalsContext";
import type { ChiefPanelNavigation } from "@/components/chief/ChiefApprovalsContext";
import type { AgentWorkItem, ApprovalProposal } from "@/components/chief/types";
import { useLibrarianWorkItems } from "./useLibrarianWorkItems";
import { usePlannerWorkItems } from "./usePlannerWorkItems";
import { usePlannerWorkItemsResource } from "./usePlannerWorkItemsResource";

export interface UseAgentWorkDataResult {
  items: AgentWorkItem[];
  activity: AgentActivityItem[];
  proposalByAwaitingWorkId: Map<string, ApprovalProposal>;
  approvals: ApprovalProposal[];
  navigation: ChiefPanelNavigation | null;
}

/**
 * Shared derivation path for AgentWorkBoard and AgentActivityTimeline —
 * both need the same combineAgentWorkItems / deriveAgentActivityTimeline /
 * proposalByAwaitingWorkId shape from the same underlying hooks, so it's
 * computed once here instead of twice.
 */
export function useAgentWorkData(): UseAgentWorkDataResult {
  const { data } = useData();
  const { approvals, navigation } = useChiefApprovals();
  const { items: librarianWorkItems } = useLibrarianWorkItems();
  const { items: plannerWorkItems } = usePlannerWorkItems();
  const { items: plannerReadyBuildWorkItems } = usePlannerWorkItemsResource();

  const items = useMemo(
    () =>
      combineAgentWorkItems({
        tasks: data.tasks,
        incidents: data.incidents,
        plannerWorkItems,
        plannerReadyBuildWorkItems,
        librarianWorkItems,
        approvals,
      }),
    [
      data.tasks,
      data.incidents,
      plannerWorkItems,
      plannerReadyBuildWorkItems,
      librarianWorkItems,
      approvals,
    ],
  );

  const activity = useMemo(
    () =>
      deriveAgentActivityTimeline({
        tasks: data.tasks,
        plannerWorkItems,
        librarianWorkItems,
      }),
    [data.tasks, plannerWorkItems, librarianWorkItems],
  );

  const proposalByAwaitingWorkId = useMemo(() => {
    const map = new Map<string, ApprovalProposal>();
    for (const proposal of approvals) {
      if (proposal.status === "pending") {
        map.set(`agentwork-awaiting-${proposal.id}`, proposal);
      }
    }
    return map;
  }, [approvals]);

  return { items, activity, proposalByAwaitingWorkId, approvals, navigation };
}
