import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchLibrarianWorkItems } from "@/lib/api/librarianRuntime";
import { isLiveApiEnabled } from "@/lib/api/client";
import type { RuntimeWorkItemClient } from "@/types/runtime";

export interface UseLibrarianWorkItemsResult {
  items: RuntimeWorkItemClient[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  byProposalId: Map<string, RuntimeWorkItemClient>;
}

export function useLibrarianWorkItems(): UseLibrarianWorkItemsResult {
  const liveApi = isLiveApiEnabled();
  const [items, setItems] = useState<RuntimeWorkItemClient[]>([]);
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
      const next = await fetchLibrarianWorkItems();
      setItems(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load librarian work items.");
    } finally {
      setIsLoading(false);
    }
  }, [liveApi]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const byProposalId = useMemo(() => {
    const map = new Map<string, RuntimeWorkItemClient>();
    for (const item of items) {
      if (item.chiefProposalId) {
        map.set(item.chiefProposalId, item);
      }
    }
    return map;
  }, [items]);

  return { items, isLoading, error, refetch, byProposalId };
}
