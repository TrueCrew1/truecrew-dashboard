import type { PlatformHealthState } from "@/types/monitor";
import { derivePlatformBriefSummary } from "@/components/chief/platformHealthSummary";

export type MonitorGuidanceTone =
  | "mock"
  | "unavailable"
  | "loading"
  | "healthy"
  | "vercel-degraded"
  | "supabase-degraded"
  | "both-degraded";

export interface MonitorGuidanceItem {
  id: string;
  label: string;
}

export interface MonitorGuidance {
  tone: MonitorGuidanceTone;
  summary: string;
  detail: string;
  checklist: MonitorGuidanceItem[];
}

const RERUN_LIVE: MonitorGuidanceItem = {
  id: "rerun-live",
  label: "Set VITE_USE_LIVE_API=true and configure Vercel/Supabase credentials to see live status.",
};
const RETRY_PROBES: MonitorGuidanceItem = {
  id: "retry-probes",
  label: "Confirm /api/monitor routes are reachable (vercel dev or a deployed preview), then retry.",
};
const REVIEW_VERCEL: MonitorGuidanceItem = {
  id: "review-vercel",
  label: "Review Vercel deployment health.",
};
const VERIFY_SUPABASE: MonitorGuidanceItem = {
  id: "verify-supabase",
  label: "Verify Supabase connectivity/config.",
};

type Probe = PlatformHealthState["vercel"] | PlatformHealthState["supabase"];

/** True only when a probe finished and returned no structured response at all — a fetch/parse failure, not a reported problem. */
function isProbeUnavailable(probe: Probe): boolean {
  return !probe.loading && probe.data === null && Boolean(probe.error);
}

/**
 * Derives Monitor page operator guidance from the same useMonitorHealth()
 * state the platform cards render. Reuses derivePlatformBriefSummary for
 * degraded/healthy interpretation instead of re-deriving it, and adds one
 * distinction Chief's brief doesn't need: a probe that never returned a
 * structured response ("unavailable") vs one that did and reported a
 * problem ("degraded").
 */
export function deriveMonitorGuidance(
  platformHealth: PlatformHealthState,
  liveApiEnabled: boolean,
): MonitorGuidance {
  if (!liveApiEnabled) {
    return {
      tone: "mock",
      summary: "Monitor is in mock/config-only mode.",
      detail: "This page is not reading live Vercel or Supabase data — every number below is sample data.",
      checklist: [RERUN_LIVE],
    };
  }

  const { vercel, supabase } = platformHealth;
  const vercelUnavailable = isProbeUnavailable(vercel);
  const supabaseUnavailable = isProbeUnavailable(supabase);

  if (!vercelUnavailable && !supabaseUnavailable && (vercel.loading || supabase.loading)) {
    return {
      tone: "loading",
      summary: "Checking platform health…",
      detail: "Waiting on the latest Vercel and Supabase probes — nothing confirmed yet.",
      checklist: [],
    };
  }

  const brief = derivePlatformBriefSummary(platformHealth, liveApiEnabled);
  const vercelIssue = vercelUnavailable
    ? `Vercel: ${vercel.error}`
    : brief.issues.find((issue) => issue.startsWith("Vercel:"));
  const supabaseIssue = supabaseUnavailable
    ? `Supabase: ${supabase.error}`
    : brief.issues.find((issue) => issue.startsWith("Supabase:"));

  if (vercelUnavailable || supabaseUnavailable) {
    return {
      tone: "unavailable",
      summary: "Platform health could not be fully confirmed.",
      detail: [vercelIssue, supabaseIssue].filter(Boolean).join(" · "),
      checklist: [RETRY_PROBES],
    };
  }

  if (vercelIssue && supabaseIssue) {
    return {
      tone: "both-degraded",
      summary: "Vercel and Supabase both need attention.",
      detail: `${vercelIssue} · ${supabaseIssue}`,
      checklist: [REVIEW_VERCEL, VERIFY_SUPABASE],
    };
  }

  if (vercelIssue) {
    return {
      tone: "vercel-degraded",
      summary: "Vercel needs attention.",
      detail: vercelIssue,
      checklist: [REVIEW_VERCEL],
    };
  }

  if (supabaseIssue) {
    return {
      tone: "supabase-degraded",
      summary: "Supabase needs attention.",
      detail: supabaseIssue,
      checklist: [VERIFY_SUPABASE],
    };
  }

  return {
    tone: "healthy",
    summary: "Vercel and Supabase are both healthy.",
    detail: "Live probes confirm no reported issues.",
    checklist: [],
  };
}
