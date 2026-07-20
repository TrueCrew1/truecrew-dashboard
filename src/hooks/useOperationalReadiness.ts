import { useCallback, useEffect, useState } from "react";
import { fetchOperationalReadiness, isLiveApiEnabled } from "@/lib/api/client";
import type { OperationalReadinessSummary } from "@/lib/ops/operationalReadinessTypes";

interface UseOperationalReadinessResult {
  summary: OperationalReadinessSummary | null;
  loading: boolean;
  error: string | null;
  liveApi: boolean;
  refresh: () => Promise<void>;
}

export function useOperationalReadiness(): UseOperationalReadinessResult {
  const liveApi = isLiveApiEnabled();
  const [summary, setSummary] = useState<OperationalReadinessSummary | null>(null);
  const [loading, setLoading] = useState(liveApi);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!liveApi) {
      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const payload = await fetchOperationalReadiness();
      setSummary(payload);
      setError(null);
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : "Failed to load operational readiness");
    } finally {
      setLoading(false);
    }
  }, [liveApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, error, liveApi, refresh };
}
