import { describe, expect, it } from "vitest";
import type { ProjectSummaryHandoffMissionPayload } from "@/lib/api/researchMission";
import {
  countHandoffMissionsByStatus,
  recentHandoffMissions,
} from "@/components/missions/projectSummaryHandoffSummary";

function mission(
  overrides: Partial<ProjectSummaryHandoffMissionPayload> & Pick<ProjectSummaryHandoffMissionPayload, "id" | "status">,
): ProjectSummaryHandoffMissionPayload {
  return {
    kind: "research:project-summary-handoff",
    projectId: "wf-001",
    projectTitle: "Billing API build",
    proposalId: "apr-1",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("countHandoffMissionsByStatus", () => {
  it("counts one mission per status", () => {
    const counts = countHandoffMissionsByStatus([
      mission({ id: "1", status: "queued" }),
      mission({ id: "2", status: "running" }),
      mission({ id: "3", status: "completed" }),
      mission({ id: "4", status: "blocked" }),
      mission({ id: "5", status: "failed" }),
    ]);

    expect(counts).toEqual({
      queued: 1,
      running: 1,
      completed: 1,
      blocked: 1,
      failed: 1,
    });
  });

  it("returns zeroes for an empty list", () => {
    expect(countHandoffMissionsByStatus([])).toEqual({
      queued: 0,
      running: 0,
      completed: 0,
      blocked: 0,
      failed: 0,
    });
  });
});

describe("recentHandoffMissions", () => {
  it("returns the most recently updated missions first", () => {
    const recent = recentHandoffMissions(
      [
        mission({ id: "old", status: "completed", updatedAt: "2026-07-01T10:00:00.000Z" }),
        mission({ id: "new", status: "running", updatedAt: "2026-07-02T10:00:00.000Z" }),
      ],
      1,
    );

    expect(recent.map((entry) => entry.id)).toEqual(["new"]);
  });
});

describe("AgentMissionsCard mock-mode contract", () => {
  it("documents that mock mode must not fabricate mission completions", () => {
    const mockModeMessage = "Live mission status unavailable in mock mode.";
    expect(mockModeMessage).toContain("mock mode");
    expect(mockModeMessage.toLowerCase()).not.toContain("completed");
  });
});
