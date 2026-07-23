import type {
  OperationalReadinessSummary,
  ReadinessStatus,
} from "./operationalReadinessTypes";

export type OperationalStatusTone = "neutral" | "warn" | "critical" | "muted";

export const OPERATIONAL_STATUS_MOCK_MODE_NOTE =
  "Operational readiness is unavailable in demo mode. Enable live API mode to load the server summary.";

export const OPERATIONAL_STATUS_DEV_ENDPOINT_NOTE =
  "Operational readiness endpoint is not returning JSON in this dev mode. Use vercel dev for live APIs, or set VITE_USE_LIVE_API=false.";

export const OPERATIONAL_STATUS_DOC_REFERENCE =
  "docs/internal/chief-operational-readiness.md";

function isDevEndpointUnavailableMessage(message: string): boolean {
  return /not wired in this dev mode|non-JSON|VITE_USE_LIVE_API/i.test(message);
}

export function readinessStatusTone(status: ReadinessStatus): OperationalStatusTone {
  switch (status) {
    case "ready":
      return "neutral";
    case "partial":
      return "warn";
    case "blocked":
      return "critical";
    case "not_wired":
      return "muted";
  }
}

export function formatReadinessStatusLabel(status: ReadinessStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "partial":
      return "Partial";
    case "blocked":
      return "Blocked";
    case "not_wired":
      return "Not wired";
  }
}

export function overallStatusHeadline(status: ReadinessStatus): string {
  switch (status) {
    case "ready":
      return "V1 operationally ready";
    case "partial":
      return "V1 partially ready";
    case "blocked":
      return "V1 blocked";
    case "not_wired":
      return "V1 not wired";
  }
}

export interface OperationalStatusPanelView {
  kind: "summary";
  summary: OperationalReadinessSummary;
}

export interface OperationalStatusUnavailableView {
  kind: "unavailable";
  tone: OperationalStatusTone;
  headline: string;
  detail: string;
}

export type OperationalStatusView =
  | OperationalStatusPanelView
  | OperationalStatusUnavailableView;

export function deriveOperationalStatusView(input: {
  liveApi: boolean;
  loading: boolean;
  error: string | null;
  summary: OperationalReadinessSummary | null;
}): OperationalStatusView {
  if (!input.liveApi) {
    return {
      kind: "unavailable",
      tone: "muted",
      headline: "Not available in demo mode",
      detail: OPERATIONAL_STATUS_MOCK_MODE_NOTE,
    };
  }

  if (input.loading && !input.summary) {
    return {
      kind: "unavailable",
      tone: "muted",
      headline: "Loading operational status…",
      detail: "Fetching readiness summary from the internal API.",
    };
  }

  if (input.error && !input.summary) {
    const soft = isDevEndpointUnavailableMessage(input.error);
    return {
      kind: "unavailable",
      tone: soft ? "muted" : "critical",
      headline: soft ? "Unavailable in this dev mode" : "Operational status unavailable",
      detail: soft ? OPERATIONAL_STATUS_DEV_ENDPOINT_NOTE : input.error,
    };
  }

  if (!input.summary) {
    return {
      kind: "unavailable",
      tone: "critical",
      headline: "Operational status not wired",
      detail: "The readiness API returned no summary payload.",
    };
  }

  return {
    kind: "summary",
    summary: input.summary,
  };
}
