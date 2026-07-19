import { describe, expect, it } from "vitest";
import { RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND } from "../lib/missions/types";
import { ROLLING_LOG_PATHS } from "../lib/obsidian/paths";
import type { ProjectSummaryHandoffMissionPayload } from "@/lib/api/researchMission";
import {
  deriveApprovalResultLinks,
  deriveHandoffMissionResultLinks,
  formatMissionOutputRefs,
  projectSummaryHandoffMissionRecordPath,
} from "@/components/chief/approvalResultLinks";
import { deriveApprovalExecutionFeedback } from "@/components/chief/approvalExecutionFeedback";
import { MONITOR_PLATFORM_APPROVAL_ID } from "@/components/chief/monitorApprovalCards";
import type { ApprovalProposal } from "@/components/chief/types";

function mission(
  overrides: Partial<ProjectSummaryHandoffMissionPayload> & Pick<ProjectSummaryHandoffMissionPayload, "id" | "status">,
): ProjectSummaryHandoffMissionPayload {
  return {
    kind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    projectId: "wf-001",
    projectTitle: "Billing API build",
    proposalId: "apr-handoff-1",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T11:00:00.000Z",
    ...overrides,
  };
}

describe("deriveHandoffMissionResultLinks", () => {
  it("includes mission record, note, artifact, and build log for completed handoffs", () => {
    const links = deriveHandoffMissionResultLinks(
      mission({
        id: "psh-123",
        status: "completed",
        outputNotePath: "Operations/Handoffs/Project Summary Handoff — Billing.md",
        handoffArtifactPath: "Operations/Handoffs/psh-123.json",
      }),
    );

    expect(links).toEqual([
      {
        label: "Mission record",
        path: projectSummaryHandoffMissionRecordPath("psh-123"),
      },
      {
        label: "Handoff note",
        path: "Operations/Handoffs/Project Summary Handoff — Billing.md",
      },
      {
        label: "Artifact",
        path: "Operations/Handoffs/psh-123.json",
      },
      {
        label: "Build Log",
        path: ROLLING_LOG_PATHS.build,
      },
    ]);
  });

  it("shows only mission record for blocked missions without artifact paths", () => {
    const links = deriveHandoffMissionResultLinks(
      mission({
        id: "psh-blocked",
        status: "blocked",
        error: "LLM unavailable",
      }),
    );

    expect(links).toEqual([
      {
        label: "Mission record",
        path: projectSummaryHandoffMissionRecordPath("psh-blocked"),
      },
    ]);
  });

  it("shows only mission record for failed missions without outputs", () => {
    const links = deriveHandoffMissionResultLinks(
      mission({
        id: "psh-failed",
        status: "failed",
        error: "Project not found",
      }),
    );

    expect(links).toHaveLength(1);
    expect(links[0]?.label).toBe("Mission record");
    expect(links.some((link) => link.label === "Build Log")).toBe(false);
  });
});

describe("deriveApprovalResultLinks", () => {
  it("returns no refs in mock mode", () => {
    const links = deriveApprovalResultLinks({
      liveApiEnabled: false,
      mission: mission({ id: "psh-1", status: "completed" }),
      missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    });

    expect(links).toEqual([]);
  });

  it("returns no refs when mission is missing", () => {
    expect(
      deriveApprovalResultLinks({
        liveApiEnabled: true,
        mission: null,
        missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
      }),
    ).toEqual([]);
  });
});

describe("formatMissionOutputRefs", () => {
  it("formats refs into a compact single line", () => {
    const formatted = formatMissionOutputRefs([
      { label: "Mission record", path: "Operations/Missions/project-summary-handoff/psh-1.json" },
      { label: "Build Log", path: ROLLING_LOG_PATHS.build },
    ]);

    expect(formatted).toContain("Mission record:");
    expect(formatted).toContain("Build Log:");
  });
});

describe("monitor approvals remain informational", () => {
  it("does not attach mission output refs to monitor cards", () => {
    const monitorProposal: ApprovalProposal = {
      id: MONITOR_PLATFORM_APPROVAL_ID,
      title: "Platform monitor: Vercel degraded",
      summary: "Vercel unreachable",
      recommendedAction: "Review monitor",
      riskNote: "High",
      status: "approved",
      createdAt: "2026-07-01T10:00:00.000Z",
    };

    const feedback = deriveApprovalExecutionFeedback({
      proposal: monitorProposal,
      liveApiEnabled: true,
    });

    const links = deriveApprovalResultLinks({
      liveApiEnabled: true,
      mission: null,
      missionKind: monitorProposal.missionKind,
    });

    expect(feedback?.kind).toBe("no_mission");
    expect(links).toEqual([]);
  });
});
