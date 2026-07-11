import { useCallback, useEffect, useMemo, useState } from "react";
import { getPlannerWorkItems } from "@/lib/api/plannerRuntime";
import { isLiveApiEnabled } from "@/lib/api/client";
import type { RuntimePlannerWorkItemClient } from "@/types/runtime";

export interface UsePlannerWorkItemsResult {
  items: RuntimePlannerWorkItemClient[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  byProposalId: Map<string, RuntimePlannerWorkItemClient>;
}

export function usePlannerWorkItems(): UsePlannerWorkItemsResult {
  const liveApi = isLiveApiEnabled();
  const [items, setItems] = useState<RuntimePlannerWorkItemClient[]>([]);
  const [isLoading, setIsLoading] = useState(liveApi);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!liveApi) {
      setItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const next = await getPlannerWorkItems();
      setItems(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load planner work items.");
    } finally {
      setIsLoading(false);
    }
  }, [liveApi]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const byProposalId = useMemo(() => {
    const map = new Map<string, RuntimePlannerWorkItemClient>();
    for (const item of items) {
      if (item.chiefProposalId) {
        map.set(item.chiefProposalId, item);
      }
    }
    return map;
  }, [items]);

  return { items, isLoading, error, refetch, byProposalId };
}
