import { describe, expect, it } from "vitest";
import type { ProjectSummaryHandoffMissionPayload } from "@/lib/api/researchMission";
import type { AgentWorkItem } from "@/components/chief/types";
import {
  deriveAgentStatusStrip,
  deriveResearchAgentStripRow,
} from "@/components/chief/agentStatusStrip";

const baseMission = (
  overrides: Partial<ProjectSummaryHandoffMissionPayload> & Pick<ProjectSummaryHandoffMissionPayload, "status">,
): ProjectSummaryHandoffMissionPayload => ({
  id: "psh-1",
  kind: "research:project-summary-handoff",
  projectId: "wf-001",
  projectTitle: "Billing API build",
  proposalId: "apr-1",
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
  ...overrides,
});

const librarianItem = (status: AgentWorkItem["status"]): AgentWorkItem => ({
  id: `lb-${status}`,
  agent: "Librarian Agent",
  task: "File artifact",
  status,
  priority: "medium",
  note: "test",
  updatedAt: "2026-07-01T10:00:00.000Z",
  source: "live",
});

describe("deriveResearchAgentStripRow", () => {
  it("marks mock mode as not live", () => {
    const row = deriveResearchAgentStripRow({
      liveApi: false,
      handoffMissions: [baseMission({ status: "completed" })],
    });

    expect(row.health).toBe("not_started");
    expect(row.label).toBe("Not live");
  });

  it("surfaces blocked missions as degraded", () => {
    const row = deriveResearchAgentStripRow({
      liveApi: true,
      handoffMissions: [baseMission({ status: "blocked", error: "LLM unavailable" })],
    });

    expect(row.health).toBe("degraded");
    expect(row.detail).toContain("blocked or failed");
  });

  it("shows running handoff when missions are in flight", () => {
    const row = deriveResearchAgentStripRow({
      liveApi: true,
      handoffMissions: [baseMission({ status: "running" })],
    });

    expect(row.label).toBe("Running handoff");
  });

  it("shows healthy idle when no missions exist", () => {
    const row = deriveResearchAgentStripRow({
      liveApi: true,
      handoffMissions: [],
    });

    expect(row.health).toBe("healthy");
    expect(row.detail).toContain("no handoff missions");
  });
});

describe("deriveAgentStatusStrip", () => {
  it("returns four core agent rows", () => {
    const rows = deriveAgentStatusStrip({
      liveApi: true,
      handoffMissions: [],
      buildGateTaskCount: 0,
      pendingBuildApprovals: 0,
      librarianItems: [],
      platformHealth: {
        vercel: { data: { ok: true, recent: [] }, loading: false, error: null },
        supabase: { data: { ok: true, db_reachable: true }, loading: false, error: null },
      },
    });

    expect(rows.map((row) => row.agent)).toEqual(["Research", "Repo", "Librarian", "Monitor"]);
  });

  it("maps monitor probe failures to degraded", () => {
    const rows = deriveAgentStatusStrip({
      liveApi: true,
      handoffMissions: [],
      buildGateTaskCount: 0,
      pendingBuildApprovals: 0,
      librarianItems: [librarianItem("active")],
      platformHealth: {
        vercel: { data: { ok: false, recent: [], error: "not configured" }, loading: false, error: null },
        supabase: { data: { ok: true, db_reachable: true }, loading: false, error: null },
      },
    });

    const monitor = rows.find((row) => row.agent === "Monitor");
    expect(monitor?.health).toBe("degraded");
  });

  it("uses config-only monitor state when live API is disabled", () => {
    const rows = deriveAgentStatusStrip({
      liveApi: false,
      handoffMissions: [],
      buildGateTaskCount: 0,
      pendingBuildApprovals: 0,
      librarianItems: [],
    });

    expect(rows.find((row) => row.agent === "Monitor")?.label).toBe("Config only");
  });
});
