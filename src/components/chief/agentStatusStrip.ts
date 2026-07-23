import type { ProjectSummaryHandoffMissionPayload } from "@/lib/api/researchMission";
import type { AgentWorkItem } from "@/components/chief/types";
import type { PlatformHealthState } from "@/types/monitor";
import { listMonitorPlatformIssues } from "./chiefMonitorSituation";

export type AgentStripHealth = "healthy" | "degraded" | "not_started";

export interface AgentStripRow {
  agent: "Research" | "Repo" | "Librarian" | "Monitor";
  health: AgentStripHealth;
  label: string;
  detail: string;
}

export interface AgentStatusStripInput {
  liveApi: boolean;
  handoffMissions: ProjectSummaryHandoffMissionPayload[];
  handoffMissionsError?: string | null;
  buildGateTaskCount: number;
  pendingBuildApprovals: number;
  librarianItems: AgentWorkItem[];
  platformHealth?: PlatformHealthState;
}

function monitorIssues(platformHealth: PlatformHealthState | undefined): string[] {
  if (!platformHealth) return [];
  return listMonitorPlatformIssues(platformHealth);
}

export function deriveResearchAgentStripRow(
  input: Pick<AgentStatusStripInput, "liveApi" | "handoffMissions" | "handoffMissionsError">,
): AgentStripRow {
  if (!input.liveApi) {
    return {
      agent: "Research",
      health: "not_started",
      label: "Not live",
      detail: "Handoff mission status requires live API mode.",
    };
  }

  if (input.handoffMissionsError) {
    return {
      agent: "Research",
      health: "degraded",
      label: "Degraded",
      detail: input.handoffMissionsError,
    };
  }

  const blockedOrFailed = input.handoffMissions.filter(
    (mission) => mission.status === "blocked" || mission.status === "failed",
  );
  if (blockedOrFailed.length > 0) {
    return {
      agent: "Research",
      health: "degraded",
      label: "Degraded",
      detail: `${blockedOrFailed.length} handoff mission(s) blocked or failed.`,
    };
  }

  const inFlight = input.handoffMissions.filter(
    (mission) => mission.status === "running" || mission.status === "queued",
  );
  if (inFlight.length > 0) {
    return {
      agent: "Research",
      health: "degraded",
      label: "Running handoff",
      detail: `${inFlight.length} project-summary-handoff mission(s) in progress.`,
    };
  }

  return {
    agent: "Research",
    health: "healthy",
    label: "Healthy",
    detail:
      input.handoffMissions.length > 0
        ? "Handoff lane idle — recent missions completed."
        : "Idle — no handoff missions yet.",
  };
}

export function deriveBuildAgentStripRow(
  input: Pick<AgentStatusStripInput, "buildGateTaskCount" | "pendingBuildApprovals">,
): AgentStripRow {
  if (input.pendingBuildApprovals > 0) {
    return {
      agent: "Repo",
      health: "healthy",
      label: "Healthy",
      detail: `${input.pendingBuildApprovals} repo approval card(s) awaiting Chief.`,
    };
  }

  if (input.buildGateTaskCount > 0) {
    return {
      agent: "Repo",
      health: "degraded",
      label: "Degraded",
      detail: `${input.buildGateTaskCount} repo task(s) blocked on open gates.`,
    };
  }

  return {
    agent: "Repo",
    health: "healthy",
    label: "Configured",
    detail: "Chief approval path wired; no autonomous repo runner.",
  };
}

export function deriveLibrarianAgentStripRow(
  input: Pick<AgentStatusStripInput, "liveApi" | "librarianItems">,
): AgentStripRow {
  if (!input.liveApi) {
    return {
      agent: "Librarian",
      health: "not_started",
      label: "Not live",
      detail: "Artifact filing uses live API + Supabase when enabled.",
    };
  }

  const blocked = input.librarianItems.filter((item) => item.status === "blocked");
  if (blocked.length > 0) {
    return {
      agent: "Librarian",
      health: "degraded",
      label: "Degraded",
      detail: `${blocked.length} filing candidate(s) blocked on gates or blockers.`,
    };
  }

  const active = input.librarianItems.filter(
    (item) => item.status === "active" || item.status === "queued",
  );
  if (active.length > 0) {
    return {
      agent: "Librarian",
      health: "healthy",
      label: "Healthy",
      detail: `${active.length} filing candidate(s) ready or in progress.`,
    };
  }

  const completed = input.librarianItems.filter((item) => item.status === "completed");
  if (completed.length > 0) {
    return {
      agent: "Librarian",
      health: "healthy",
      label: "Healthy",
      detail: `${completed.length} task artifact(s) filed to Obsidian.`,
    };
  }

  return {
    agent: "Librarian",
    health: "not_started",
    label: "Not started",
    detail: "No librarian filing candidates in current data.",
  };
}

export function deriveMonitorAgentStripRow(
  input: Pick<AgentStatusStripInput, "liveApi" | "platformHealth">,
): AgentStripRow {
  if (!input.liveApi) {
    return {
      agent: "Monitor",
      health: "not_started",
      label: "Config only",
      detail: "Platform probes run only when live API mode is enabled.",
    };
  }

  const { platformHealth } = input;
  if (!platformHealth) {
    return {
      agent: "Monitor",
      health: "not_started",
      label: "Not live",
      detail: "Monitor health has not loaded yet.",
    };
  }

  if (platformHealth.vercel.loading || platformHealth.supabase.loading) {
    return {
      agent: "Monitor",
      health: "not_started",
      label: "Loading",
      detail: "Checking Vercel and Supabase probes…",
    };
  }

  const issues = monitorIssues(platformHealth);
  if (issues.length > 0) {
    return {
      agent: "Monitor",
      health: "degraded",
      label: "Degraded",
      detail: issues.join(" · "),
    };
  }

  const hasProbeData =
    platformHealth.vercel.data !== null || platformHealth.supabase.data !== null;

  if (!hasProbeData) {
    return {
      agent: "Monitor",
      health: "not_started",
      label: "Config only",
      detail: "Monitor probes have not returned data yet.",
    };
  }

  return {
    agent: "Monitor",
    health: "healthy",
    label: "Healthy",
    detail: "Vercel and Supabase probes reporting OK.",
  };
}

export function deriveAgentStatusStrip(input: AgentStatusStripInput): AgentStripRow[] {
  return [
    deriveResearchAgentStripRow(input),
    deriveBuildAgentStripRow(input),
    deriveLibrarianAgentStripRow(input),
    deriveMonitorAgentStripRow(input),
  ];
}

export function agentStripHealthClass(health: AgentStripHealth): string {
  switch (health) {
    case "healthy":
      return "agent-status-strip-row--healthy";
    case "degraded":
      return "agent-status-strip-row--degraded";
    default:
      return "agent-status-strip-row--not-started";
  }
}
