import type { PlatformHealthState } from "@/types/monitor";

export type PlatformBriefTone = "mock" | "loading" | "healthy" | "issue";

export interface PlatformBriefSummary {
  tone: PlatformBriefTone;
  headline: string;
  issues: string[];
}

const MOCK_HEADLINE = "Monitor in mock/config-only mode — not live platform data";
const HEALTHY_HEADLINE = "Vercel and Supabase healthy";
const LOADING_HEADLINE = "Checking platform health…";

/** Null when Vercel is fine — only describes an actual reported problem. */
function vercelIssueLabel(vercel: PlatformHealthState["vercel"]): string | null {
  if (vercel.error) return `Vercel: ${vercel.error}`;
  if (vercel.data && vercel.data.ok === false) {
    return `Vercel: ${vercel.data.error ?? "reporting an error"}`;
  }
  if (vercel.data?.latest?.state && vercel.data.latest.state.toUpperCase() === "ERROR") {
    return "Vercel: latest deploy failed";
  }
  return null;
}

/** Null when Supabase is fine — only describes an actual reported problem. */
function supabaseIssueLabel(supabase: PlatformHealthState["supabase"]): string | null {
  if (supabase.error) return `Supabase: ${supabase.error}`;
  if (supabase.data && supabase.data.ok === false) {
    return `Supabase: ${supabase.data.error ?? supabase.data.message ?? "reporting an error"}`;
  }
  if (supabase.data && supabase.data.db_reachable === false) {
    return "Supabase: database unreachable";
  }
  return null;
}

/**
 * Derives the Chief situation-brief platform line from the same
 * useMonitorHealth() state Monitor renders — never claims "healthy" for
 * mock mode, missing config, or a still-in-flight fetch.
 */
export function derivePlatformBriefSummary(
  platformHealth: PlatformHealthState | undefined,
  liveApiEnabled: boolean,
): PlatformBriefSummary {
  if (!liveApiEnabled || !platformHealth) {
    return { tone: "mock", headline: MOCK_HEADLINE, issues: [] };
  }

  const { vercel, supabase } = platformHealth;
  const issues = [vercelIssueLabel(vercel), supabaseIssueLabel(supabase)].filter(
    (issue): issue is string => issue !== null,
  );

  if (issues.length > 0) {
    return { tone: "issue", headline: `Platform issue — ${issues.join(" · ")}`, issues };
  }

  if (vercel.loading || supabase.loading) {
    return { tone: "loading", headline: LOADING_HEADLINE, issues: [] };
  }

  return { tone: "healthy", headline: HEALTHY_HEADLINE, issues: [] };
}
