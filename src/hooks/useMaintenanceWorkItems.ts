import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMaintenanceWorkItems } from "@/lib/api/maintenanceRuntime";
import { isLiveApiEnabled } from "@/lib/api/client";
import type { RuntimeMaintenanceWorkItemClient } from "@/types/runtime";

export interface UseMaintenanceWorkItemsResult {
  items: RuntimeMaintenanceWorkItemClient[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  byProposalId: Map<string, RuntimeMaintenanceWorkItemClient>;
}

export function useMaintenanceWorkItems(): UseMaintenanceWorkItemsResult {
  const liveApi = isLiveApiEnabled();
  const [items, setItems] = useState<RuntimeMaintenanceWorkItemClient[]>([]);
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
      const next = await fetchMaintenanceWorkItems();
      setItems(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load maintenance work items.");
    } finally {
      setIsLoading(false);
    }
  }, [liveApi]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const byProposalId = useMemo(() => {
    const map = new Map<string, RuntimeMaintenanceWorkItemClient>();
    for (const item of items) {
      if (item.chiefProposalId) {
        map.set(item.chiefProposalId, item);
      }
    }
    return map;
  }, [items]);

  return { items, isLoading, error, refetch, byProposalId };
}
