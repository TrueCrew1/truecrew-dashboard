import { useCallback, useEffect, useState } from "react";
import { getPlannerWorkItems } from "@/lib/api/plannerWorkItems";
import { isLiveApiEnabled } from "@/lib/api/client";
import type { PlannerWorkItem } from "@/types/plannerWorkItems";

export interface UsePlannerWorkItemsResourceResult {
  items: PlannerWorkItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * The planner_work_items task tracker (/api/planner/work-items) — not the
 * agent-runtime queue. See src/hooks/usePlannerWorkItems.ts for that.
 */
export function usePlannerWorkItemsResource(): UsePlannerWorkItemsResourceResult {
  const liveApi = isLiveApiEnabled();
  const [items, setItems] = useState<PlannerWorkItem[]>([]);
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

  return { items, isLoading, error, refetch };
}
