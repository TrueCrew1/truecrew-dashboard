import { listApprovalActivityRecords } from "../approvals/approvalActivityStore.js";
import { isVaultConfigured } from "../obsidian/config.js";
import { listMonitorIncidentPostmortemMissions } from "../missions/monitorIncidentPostmortemStore.js";
import { listProjectSummaryHandoffMissions } from "../missions/projectSummaryHandoffStore.js";
import { isSupabaseConfigured } from "../supabase/admin.js";
import { fetchChiefApprovalDecisions } from "../supabase/queries.js";
import {
  buildDailyTurnoverSnapshot,
  type DailyTurnoverHealthSnapshot,
  type DailyTurnoverSnapshot,
  type GovernedMission,
  DEFAULT_TURNOVER_WINDOW_HOURS,
} from "./dailyTurnover.js";

function buildHealthSnapshot(): DailyTurnoverHealthSnapshot {
  const vaultConfigured = isVaultConfigured();
  const supabaseConfigured = isSupabaseConfigured();
  const slackConfigured = Boolean(process.env.SLACK_WEBHOOK_URL?.trim());
  const githubConfigured = Boolean(process.env.GITHUB_WEBHOOK_SECRET?.trim());
  const vercelMonitorConfigured = Boolean(
    process.env.VERCEL_API_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim(),
  );

  return {
    vault: vaultConfigured ? "configured" : "not configured",
    supabase: supabaseConfigured ? "configured" : "not configured",
    slackWebhook: slackConfigured ? "configured" : "not configured",
    githubWebhook: githubConfigured ? "configured" : "not configured",
    repoHealth: vercelMonitorConfigured
      ? "partial (Vercel deploy probe env present; CI aggregate not wired)"
      : "not yet wired",
  };
}

export async function collectDailyTurnoverSnapshot(input?: {
  generatedAt?: string;
  windowHours?: number;
}): Promise<DailyTurnoverSnapshot> {
  const generatedAt = input?.generatedAt ?? new Date().toISOString();
  const windowHours = input?.windowHours ?? DEFAULT_TURNOVER_WINDOW_HOURS;
  const dataNotes: string[] = [];

  let vaultRecords = [] as ReturnType<typeof listApprovalActivityRecords>;
  if (isVaultConfigured()) {
    try {
      vaultRecords = listApprovalActivityRecords();
    } catch (error) {
      dataNotes.push(
        `vault activity unreadable: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  } else {
    dataNotes.push("vault not configured — approval activity counts may be partial");
  }

  let supabaseDecisions: Awaited<ReturnType<typeof fetchChiefApprovalDecisions>> = [];
  if (isSupabaseConfigured()) {
    try {
      supabaseDecisions = await fetchChiefApprovalDecisions();
    } catch (error) {
      dataNotes.push(
        `supabase decisions unreadable: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  } else {
    dataNotes.push("supabase not configured — decision counts may be partial");
  }

  let missions: GovernedMission[] = [];
  if (!isVaultConfigured()) {
    dataNotes.push("mission store unavailable without vault");
  } else {
    try {
      missions = [
        ...listProjectSummaryHandoffMissions(),
        ...listMonitorIncidentPostmortemMissions(),
      ];
    } catch (error) {
      dataNotes.push(
        `mission store unreadable: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  return buildDailyTurnoverSnapshot({
    generatedAt,
    windowHours,
    vaultRecords,
    supabaseDecisions: supabaseDecisions.map((row) => ({
      proposalId: row.proposal_id,
      status: row.status,
      decidedAt: row.decided_at,
    })),
    missions,
    health: buildHealthSnapshot(),
    dataNotes,
    pendingApprovals: null,
    pendingApprovalsNote: "not persisted server-side in V1 (use Chief Approvals UI)",
  });
}
