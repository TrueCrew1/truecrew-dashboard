import { useCallback, useEffect, useState } from "react";

import {
  fetchChiefApprovalDecisions,
  isLiveApiEnabled,
  type ChiefApprovalDecisionPayload,
} from "../../lib/api/client";

export interface UseApprovalAlertsResult {
  decisions: ChiefApprovalDecisionPayload[];
  isLoading: boolean;
  error: string | null;
  /** Re-runs the live fetch on demand — e.g. a Retry button. No-op when the live API is disabled. */
  refetch: () => void;
}

export function useApprovalAlerts(): UseApprovalAlertsResult {
  const liveApi = isLiveApiEnabled();
  const [decisions, setDecisions] = useState<ChiefApprovalDecisionPayload[]>([]);
  const [isLoading, setIsLoading] = useState(liveApi);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!liveApi) return;

    let isMounted = true;

    const loadDecisions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchChiefApprovalDecisions();

        if (isMounted) {
          setDecisions(payload);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load approval alerts.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDecisions();

    return () => {
      isMounted = false;
    };
  }, [liveApi]);

  const refetch = useCallback(() => {
    if (!liveApi) return;

    setIsLoading(true);
    setError(null);

    fetchChiefApprovalDecisions()
      .then(setDecisions)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load approval alerts.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [liveApi]);

  return { decisions, isLoading, error, refetch };
}
