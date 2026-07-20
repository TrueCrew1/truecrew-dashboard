import type { DailyTurnoverApiResponse, DailyTurnoverHistoryEntry } from "./dailyTurnoverTypes";

export const DAILY_TURNOVER_HISTORY_STORAGE_KEY = "chief-daily-turnover-history-v1";
export const DAILY_TURNOVER_HISTORY_LIMIT = 5;

export function buildHistoryEntryFromResponse(
  response: DailyTurnoverApiResponse,
  triggeredAt = new Date().toISOString(),
): DailyTurnoverHistoryEntry {
  return {
    generatedAt: response.generatedAt,
    message: response.message,
    slack: response.slack,
    counts: response.summary.counts,
    summary: response.summary,
    triggeredAt,
  };
}

export function historyEntryToApiResponse(entry: DailyTurnoverHistoryEntry): DailyTurnoverApiResponse {
  return {
    ok: true,
    generatedAt: entry.generatedAt,
    message: entry.message,
    summary: entry.summary,
    slack: entry.slack,
  };
}

export function readDailyTurnoverHistory(
  storage: Pick<Storage, "getItem"> = sessionStorage,
): DailyTurnoverHistoryEntry[] {
  const raw = storage.getItem(DAILY_TURNOVER_HISTORY_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as DailyTurnoverHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendDailyTurnoverHistory(
  entry: DailyTurnoverHistoryEntry,
  storage: Pick<Storage, "getItem" | "setItem"> = sessionStorage,
): DailyTurnoverHistoryEntry[] {
  const next = [entry, ...readDailyTurnoverHistory(storage)].slice(0, DAILY_TURNOVER_HISTORY_LIMIT);
  storage.setItem(DAILY_TURNOVER_HISTORY_STORAGE_KEY, JSON.stringify(next));
  return next;
}
