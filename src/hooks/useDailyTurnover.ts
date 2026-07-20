import { useCallback, useEffect, useState } from "react";
import { isLiveApiEnabled, triggerDailyTurnover } from "@/lib/api/client";
import {
  appendDailyTurnoverHistory,
  buildHistoryEntryFromResponse,
  historyEntryToApiResponse,
  readDailyTurnoverHistory,
} from "@/lib/chief/dailyTurnoverHistory";
import type {
  DailyTurnoverApiResponse,
  DailyTurnoverHistoryEntry,
} from "@/lib/chief/dailyTurnoverTypes";

interface UseDailyTurnoverResult {
  liveApi: boolean;
  triggering: boolean;
  error: string | null;
  lastResult: DailyTurnoverApiResponse | null;
  history: DailyTurnoverHistoryEntry[];
  trigger: () => Promise<void>;
}

export function useDailyTurnover(): UseDailyTurnoverResult {
  const liveApi = isLiveApiEnabled();
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<DailyTurnoverApiResponse | null>(null);
  const [history, setHistory] = useState<DailyTurnoverHistoryEntry[]>([]);

  useEffect(() => {
    const stored = readDailyTurnoverHistory();
    setHistory(stored);
    if (stored[0]) {
      setLastResult(historyEntryToApiResponse(stored[0]));
    }
  }, []);

  const trigger = useCallback(async () => {
    if (!liveApi) {
      setError(null);
      return;
    }

    setTriggering(true);
    setError(null);

    try {
      const response = await triggerDailyTurnover();
      setLastResult(response);
      const entry = buildHistoryEntryFromResponse(response);
      setHistory(appendDailyTurnoverHistory(entry));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger daily turnover");
    } finally {
      setTriggering(false);
    }
  }, [liveApi]);

  return {
    liveApi,
    triggering,
    error,
    lastResult,
    history,
    trigger,
  };
}
