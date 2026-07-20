import type {
  DailyTurnoverApiResponse,
  DailyTurnoverHistoryEntry,
  DailyTurnoverSlackStatus,
} from "./dailyTurnoverTypes";

export const DAILY_TURNOVER_MOCK_MODE_NOTE =
  "Daily turnover requires live API mode. Enable VITE_USE_LIVE_API to trigger the internal route.";

export const DAILY_TURNOVER_HISTORY_NOTE =
  "Session history only — turnover results are not persisted server-side in V1.";

export const DAILY_TURNOVER_DOC_REFERENCE = "docs/internal/chief-daily-turnover.md";

export type DailyTurnoverPanelTone = "neutral" | "warn" | "critical" | "muted";

export function turnoverAvailabilityLabel(liveApi: boolean): string {
  return liveApi ? "Available" : "Unavailable";
}

export function turnoverAvailabilityTone(liveApi: boolean): DailyTurnoverPanelTone {
  return liveApi ? "neutral" : "muted";
}

export function formatSlackDeliveryStatus(slack: DailyTurnoverSlackStatus): string {
  if (!slack.configured) return "Slack webhook not configured — summary generated only";
  if (slack.attempted) return "Slack delivery attempted";
  return "Slack not attempted";
}

export function summarizeTurnoverCounts(
  counts: DailyTurnoverApiResponse["summary"]["counts"],
): string {
  const pending =
    counts.pendingApprovals === null
      ? `pending n/a`
      : `${counts.pendingApprovals} pending`;
  return `${counts.approvedActivity24h} approved · ${counts.failedOrBlocked24h} failed/blocked · ${pending} · ${counts.queuedMissions} queued`;
}

export function messagePreview(message: string, maxLength = 180): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1)}…`;
}

export interface DailyTurnoverPanelState {
  tone: DailyTurnoverPanelTone;
  headline: string;
  detail: string;
}

export function deriveTurnoverUnavailableState(input: {
  liveApi: boolean;
  loading: boolean;
  error: string | null;
}): DailyTurnoverPanelState | null {
  if (!input.liveApi) {
    return {
      tone: "muted",
      headline: "Not available in demo mode",
      detail: DAILY_TURNOVER_MOCK_MODE_NOTE,
    };
  }

  if (input.loading && !input.error) {
    return {
      tone: "muted",
      headline: "Loading turnover status…",
      detail: "Checking the latest known session result.",
    };
  }

  if (input.error) {
    return {
      tone: "critical",
      headline: "Turnover unavailable",
      detail: input.error,
    };
  }

  return null;
}

export function historyIsEmpty(history: readonly DailyTurnoverHistoryEntry[]): boolean {
  return history.length === 0;
}
