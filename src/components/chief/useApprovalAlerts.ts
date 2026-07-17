import { useCallback, useEffect, useRef, useState } from "react";

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
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!liveApi) return;

    const loadDecisions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchChiefApprovalDecisions();

        if (isMountedRef.current) {
          setDecisions(payload);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Failed to load approval alerts.");
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    void loadDecisions();
  }, [liveApi]);

  const refetch = useCallback(() => {
    if (!liveApi) return;

    setIsLoading(true);
    setError(null);

    fetchChiefApprovalDecisions()
      .then((payload) => {
        if (isMountedRef.current) {
          setDecisions(payload);
        }
      })
      .catch((err: unknown) => {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : "Failed to load approval alerts.");
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      });
  }, [liveApi]);

  return { decisions, isLoading, error, refetch };
}
