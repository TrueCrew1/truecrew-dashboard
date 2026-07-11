import { useCallback, useEffect, useState } from "react";
import { fetchChiefApprovalAuditEvents } from "@/lib/api/chiefApprovalAudit";
import { isLiveApiEnabled } from "@/lib/api/client";
import type { ChiefApprovalAuditEvent } from "@/lib/api/chiefApprovalAudit";

export interface UseChiefApprovalAuditEventsResult {
  events: ChiefApprovalAuditEvent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Single load on mount — no polling. Intended for a panel that only mounts on tab open. */
export function useChiefApprovalAuditEvents(): UseChiefApprovalAuditEventsResult {
  const liveApi = isLiveApiEnabled();
  const [events, setEvents] = useState<ChiefApprovalAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(liveApi);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!liveApi) {
      setEvents([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const next = await fetchChiefApprovalAuditEvents();
      setEvents(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approval audit events.");
    } finally {
      setIsLoading(false);
    }
  }, [liveApi]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { events, isLoading, error, refetch };
}
