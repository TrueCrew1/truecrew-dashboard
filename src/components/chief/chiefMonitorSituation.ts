import type { PlatformHealthState } from "@/types/monitor";

export type ChiefMonitorBriefTone =
  | "healthy"
  | "degraded"
  | "loading"
  | "unavailable"
  | "mock";

export interface ChiefMonitorSituationBrief {
  tone: ChiefMonitorBriefTone;
  headline: string;
  detail?: string;
  primaryIssue?: string;
  allIssues: string[];
}

/** Null when Vercel probe reports no problem. */
export function vercelMonitorIssue(vercel: PlatformHealthState["vercel"]): string | null {
  if (vercel.error) return `Vercel: ${vercel.error}`;
  if (vercel.data && vercel.data.ok === false) {
    return `Vercel: ${vercel.data.error ?? "reporting an error"}`;
  }
  if (vercel.data?.latest?.state && vercel.data.latest.state.toUpperCase() === "ERROR") {
    return "Vercel: latest deploy failed";
  }
  return null;
}

/** Null when Supabase probe reports no problem. */
export function supabaseMonitorIssue(supabase: PlatformHealthState["supabase"]): string | null {
  if (supabase.error) return `Supabase: ${supabase.error}`;
  if (supabase.data && supabase.data.ok === false) {
    return `Supabase: ${supabase.data.error ?? supabase.data.message ?? "reporting an error"}`;
  }
  if (supabase.data && supabase.data.db_reachable === false) {
    return "Supabase: database unreachable";
  }
  return null;
}

export function listMonitorPlatformIssues(platformHealth: PlatformHealthState): string[] {
  return [vercelMonitorIssue(platformHealth.vercel), supabaseMonitorIssue(platformHealth.supabase)].filter(
    (issue): issue is string => issue !== null,
  );
}

function isProbeConfirmedHealthy(
  platformHealth: PlatformHealthState,
  issues: string[],
): boolean {
  if (issues.length > 0) return false;

  const { vercel, supabase } = platformHealth;
  const vercelOk = vercel.data?.ok === true && !vercel.error;
  const supabaseOk = supabase.data?.ok === true && supabase.data.db_reachable !== false && !supabase.error;

  return vercelOk && supabaseOk;
}

export function deriveChiefSituationBriefFromMonitor(input: {
  liveApiEnabled: boolean;
  platformHealth?: PlatformHealthState;
}): ChiefMonitorSituationBrief {
  if (!input.liveApiEnabled) {
    return {
      tone: "mock",
      headline: "Platform probes not live",
      detail: "Mock/config-only mode — open Monitor for the detailed health view when live API is enabled.",
      allIssues: [],
    };
  }

  const platformHealth = input.platformHealth;
  if (!platformHealth) {
    return {
      tone: "unavailable",
      headline: "Platform probes unavailable",
      detail: "Monitor health has not loaded yet.",
      allIssues: [],
    };
  }

  const { vercel, supabase } = platformHealth;
  const loading = vercel.loading || supabase.loading;

  if (loading) {
    return {
      tone: "loading",
      headline: "Checking platform health",
      detail: "Polling Vercel and Supabase probes…",
      allIssues: [],
    };
  }

  const issues = listMonitorPlatformIssues(platformHealth);

  if (issues.length > 0) {
    const primaryIssue = issues[0];
    const headline =
      issues.length > 1
        ? "Multiple platform issues"
        : primaryIssue.startsWith("Vercel:")
          ? "Vercel degraded"
          : "Supabase degraded";

    const detail =
      issues.length > 1 ? issues.join(" · ") : primaryIssue.replace(/^[^:]+:\s*/, "");

    return {
      tone: "degraded",
      headline,
      detail,
      primaryIssue,
      allIssues: issues,
    };
  }

  if (isProbeConfirmedHealthy(platformHealth, issues)) {
    return {
      tone: "healthy",
      headline: "Platform healthy",
      detail: "Vercel and Supabase probes reporting OK.",
      allIssues: [],
    };
  }

  const hasAnyData = vercel.data !== null || supabase.data !== null;
  if (!hasAnyData) {
    return {
      tone: "unavailable",
      headline: "Platform probes unavailable",
      detail: "Monitor returned no probe data — check env on Monitor before trusting platform health.",
      allIssues: [],
    };
  }

  return {
    tone: "unavailable",
    headline: "Platform health unconfirmed",
    detail: "Probes finished without a clear healthy signal — review Monitor for details.",
    allIssues: [],
  };
}

export function chiefMonitorBriefStatusClass(tone: ChiefMonitorBriefTone): string {
  return `chief-brief-platform--${tone}`;
}
