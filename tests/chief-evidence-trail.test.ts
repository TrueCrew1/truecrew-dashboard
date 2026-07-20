import { describe, expect, it } from "vitest";
import {
  buildGovernedEvidenceTrail,
  evidenceTrailStatusLabel,
  formatEvidenceAvailability,
  isGovernedEvidenceTrailCandidate,
} from "@/lib/chief/governedEvidenceTrail";
import { RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND } from "@/components/chief/researchMissionHelpers";
import type { ApprovalProposal } from "@/components/chief/types";
import type { ResearchMissionPayload } from "@/components/chief/researchMonitorIncidentPostmortem";

function buildProposal(
  overrides: Partial<ApprovalProposal> = {},
): ApprovalProposal {
  return {
    id: "apr-handoff-1",
    title: "Project summary handoff",
    summary: "Approve Research handoff for workflow wf-1.",
    recommendedAction: "Approve handoff",
    riskNote: "Low",
    status: "approved",
    createdAt: "2026-07-20T00:00:00.000Z",
    decidedAt: "2026-07-20T00:05:00.000Z",
    missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    missionProjectId: "wf-1",
    ...overrides,
  };
}

function buildMission(
  overrides: Partial<ResearchMissionPayload> = {},
): ResearchMissionPayload {
  return {
    id: "mission-1",
    kind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    proposalId: "apr-handoff-1",
    projectId: "wf-1",
    status: "completed",
    outputNotePath: "Operations/Handoffs/Project Summary Handoff — wf-1.md",
    handoffArtifactPath: "Operations/Handoffs/mission-1.json",
    ...overrides,
  } as ResearchMissionPayload;
}

describe("governedEvidenceTrail", () => {
  it("identifies governed evidence candidates", () => {
    expect(
      isGovernedEvidenceTrailCandidate(
        buildProposal({ status: "pending", missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND }),
      ),
    ).toBe(true);
    expect(
      isGovernedEvidenceTrailCandidate(
        buildProposal({ status: "approved", missionKind: undefined }),
      ),
    ).toBe(true);
  });

  it("marks demo mode trails unavailable with honest warnings", () => {
    const trail = buildGovernedEvidenceTrail({
      proposal: buildProposal(),
      liveApiEnabled: false,
    });

    expect(trail.status).toBe("unavailable");
    expect(trail.warnings.some((warning) => warning.code === "mock_mode")).toBe(true);
    expect(trail.verification.every((step) => step.availability === "not_wired")).toBe(true);
  });

  it("builds a partial trail when mission record is missing after approval", () => {
    const trail = buildGovernedEvidenceTrail({
      proposal: buildProposal(),
      liveApiEnabled: true,
    });

    expect(trail.status).toBe("partial");
    expect(trail.warnings.some((warning) => warning.code === "mission_missing")).toBe(true);
    expect(
      trail.references.some(
        (reference) =>
          reference.label === "Approval activity record" &&
          reference.availability === "not_recorded",
      ),
    ).toBe(true);
  });

  it("builds a complete trail with mission artifacts and builder report verification", () => {
    const trail = buildGovernedEvidenceTrail({
      proposal: buildProposal(),
      liveApiEnabled: true,
      mission: buildMission(),
      activityRecord: {
        proposalId: "apr-handoff-1",
        title: "Project summary handoff",
        summary: "Approve Research handoff for workflow wf-1.",
        decision: "approved",
        decidedAt: "2026-07-20T00:05:00.000Z",
        actor: "founder",
        recordedAt: "2026-07-20T00:05:01.000Z",
        missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
      },
      builderReport: {
        status: "success",
        verification: [
          { step: "build", outcome: "pass" },
          { step: "test", outcome: "pass" },
          { step: "lint", outcome: "pass" },
        ],
      },
      capabilities: {
        builderReportModule: true,
        dailyTurnoverModule: false,
      },
    });

    expect(trail.status).toBe("complete");
    expect(trail.verification.every((step) => step.availability === "recorded")).toBe(true);
    expect(trail.references.some((reference) => reference.label === "Handoff note")).toBe(true);
    expect(trail.reporting.builderReport).toBe("partial");
    expect(trail.reporting.turnover).toBe("not_wired");
  });

  it("formats availability and status labels", () => {
    expect(formatEvidenceAvailability("not_wired")).toBe("Not wired");
    expect(evidenceTrailStatusLabel("partial")).toBe("Partial");
  });
});
