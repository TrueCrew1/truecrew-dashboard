import type { PlatformHealthState } from "@/types/monitor";
import { CHIEF_ROUTES } from "./chiefRoutes";
import {
  deriveChiefSituationBriefFromMonitor,
  listMonitorPlatformIssues,
} from "./chiefMonitorSituation";
import { stableChiefId } from "./chiefMock";
import type { ApprovalProposal, ApprovalChecklistItem } from "./types";

/** Stable id for the single live monitor approval card (deduped across polls). */
export const MONITOR_PLATFORM_APPROVAL_ID = stableChiefId(
  "apr-monitor-platform",
  "live-probes",
);

function monitorApprovalTitle(issues: string[]): string {
  if (issues.length > 1) return "Platform monitor: multiple issues";
  if (issues[0]?.startsWith("Vercel:")) return "Platform monitor: Vercel degraded";
  return "Platform monitor: Supabase degraded";
}

function monitorRiskLevel(issues: string[]): "high" | "medium" {
  const combined = issues.join(" ").toLowerCase();
  if (combined.includes("unreachable") || combined.includes("failed")) return "high";
  return "medium";
}

/**
 * Derives zero or one Chief approval card from live monitor probe state.
 * Returns an empty list when mock mode, loading, healthy, or probes are unavailable.
 */
export function deriveMonitorApprovalCards(input: {
  liveApiEnabled: boolean;
  platformHealth?: PlatformHealthState;
  createdAt?: string;
}): ApprovalProposal[] {
  if (!input.liveApiEnabled) return [];

  const brief = deriveChiefSituationBriefFromMonitor({
    liveApiEnabled: true,
    platformHealth: input.platformHealth,
  });

  if (brief.tone !== "degraded" || brief.allIssues.length === 0) {
    return [];
  }

  const issues = brief.allIssues;
  const riskLevel = monitorRiskLevel(issues);
  const createdAt = input.createdAt ?? new Date().toISOString();

  const checklist: ApprovalChecklistItem[] = issues.map((issue) => ({
    label: issue,
    status: "pass",
  }));

  checklist.push({
    label: "Remediation plan recorded or deferred with reason",
    status: "pending",
  });

  return [
    {
      id: MONITOR_PLATFORM_APPROVAL_ID,
      title: monitorApprovalTitle(issues),
      summary: issues.join(" · "),
      recommendedAction:
        "Review platform health on Monitor, triage the reported probe failure, and acknowledge once handled or explicitly deferred.",
      riskNote:
        riskLevel === "high"
          ? "High — live monitor reports a platform probe failure that may block operations."
          : "Medium — live monitor reports a platform probe issue; review before continuing dependent work.",
      status: "pending",
      createdAt,
      category: "alert_action",
      source: "ops_change",
      recommendedDecision: "hold",
      checklist,
      routeTo: CHIEF_ROUTES.monitor,
      routeLabel: "Monitor",
    },
  ];
}

/** @internal Exposed for tests that assert issue detection alignment with the brief. */
export function monitorIssuesForApproval(platformHealth: PlatformHealthState): string[] {
  return listMonitorPlatformIssues(platformHealth);
}
