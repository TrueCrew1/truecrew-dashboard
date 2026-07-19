import { describe, expect, it } from "vitest";
import { RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND } from "../lib/missions/types";
import type { ProjectSummaryHandoffMissionPayload } from "@/lib/api/researchMission";
import {
  APPROVAL_EXECUTION_MOCK_NOTE,
  deriveApprovalExecutionFeedback,
  launchErrorFromApprovalActionMessage,
} from "@/components/chief/approvalExecutionFeedback";
import { MONITOR_PLATFORM_APPROVAL_ID } from "@/components/chief/monitorApprovalCards";
import {
  buildResearchProjectSummaryHandoffRequest,
  researchProjectSummaryHandoffProposalId,
} from "@/components/chief/researchProjectSummaryHandoff";
import type { ApprovalProposal } from "@/components/chief/types";
import type { Workflow } from "@/types";

const sampleWorkflow: Workflow = {
  id: "wf-001",
  title: "Billing API v2.4.1 build",
  type: "build",
  stage: "In Progress",
  owner: "founder",
  summary: "Rate limiter and webhook retries.",
  gates: [],
  linkedTaskIds: ["task-001"],
  linkedEntityIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function handoffProposal(status: ApprovalProposal["status"] = "approved"): ApprovalProposal {
  const request = buildResearchProjectSummaryHandoffRequest(sampleWorkflow);
  return {
    id: researchProjectSummaryHandoffProposalId(sampleWorkflow.id),
    title: request.gate,
    summary: request.summary,
    recommendedAction: request.requestedAction,
    riskNote: "Low",
    status,
    createdAt: request.createdAt ?? new Date().toISOString(),
    missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    missionProjectId: sampleWorkflow.id,
    source: "research_agent",
  };
}

function monitorProposal(status: ApprovalProposal["status"] = "approved"): ApprovalProposal {
  return {
    id: MONITOR_PLATFORM_APPROVAL_ID,
    title: "Platform monitor: Vercel degraded",
    summary: "Vercel: deployments unreachable",
    recommendedAction: "Review platform health on Monitor.",
    riskNote: "High",
    status,
    createdAt: "2026-07-01T10:00:00.000Z",
    category: "alert_action",
    source: "ops_change",
  };
}

function mission(
  status: ProjectSummaryHandoffMissionPayload["status"],
  overrides: Partial<ProjectSummaryHandoffMissionPayload> = {},
): ProjectSummaryHandoffMissionPayload {
  return {
    id: "mission-1",
    kind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    status,
    projectId: sampleWorkflow.id,
    projectTitle: sampleWorkflow.title,
    proposalId: researchProjectSummaryHandoffProposalId(sampleWorkflow.id),
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T11:00:00.000Z",
    ...overrides,
  };
}

describe("deriveApprovalExecutionFeedback — handoff missions", () => {
  it.each([
    ["queued", "Mission queued"],
    ["running", "Mission running"],
    ["completed", "Mission completed"],
  ] as const)("maps %s mission status to %s", (status, message) => {
    const feedback = deriveApprovalExecutionFeedback({
      proposal: handoffProposal(),
      liveApiEnabled: true,
      mission: mission(status),
    });

    expect(feedback?.message).toBe(message);
    expect(feedback?.kind).toBe(`mission_${status}`);
  });

  it("maps blocked mission status with error detail", () => {
    const feedback = deriveApprovalExecutionFeedback({
      proposal: handoffProposal(),
      liveApiEnabled: true,
      mission: mission("blocked", { error: "Supabase unavailable" }),
    });

    expect(feedback?.kind).toBe("mission_blocked");
    expect(feedback?.message).toContain("Mission blocked");
    expect(feedback?.message).toContain("Supabase unavailable");
  });

  it("maps failed mission status with error detail", () => {
    const feedback = deriveApprovalExecutionFeedback({
      proposal: handoffProposal(),
      liveApiEnabled: true,
      mission: mission("failed", { error: "LLM timeout" }),
    });

    expect(feedback?.kind).toBe("mission_failed");
    expect(feedback?.message).toContain("Mission failed");
    expect(feedback?.message).toContain("LLM timeout");
  });

  it("never reports completed unless mission status is completed", () => {
    const running = deriveApprovalExecutionFeedback({
      proposal: handoffProposal(),
      liveApiEnabled: true,
      mission: mission("running"),
    });

    expect(running?.message).not.toContain("completed");
  });

  it("shows waiting state when approved but mission record is missing", () => {
    const feedback = deriveApprovalExecutionFeedback({
      proposal: handoffProposal(),
      liveApiEnabled: true,
      mission: null,
    });

    expect(feedback?.kind).toBe("mission_waiting");
    expect(feedback?.message).toContain("waiting");
  });

  it("surfaces launch failure from approval action errors", () => {
    const feedback = deriveApprovalExecutionFeedback({
      proposal: handoffProposal(),
      liveApiEnabled: true,
      launchError: "Approved, but mission did not run: vault not configured",
    });

    expect(feedback?.kind).toBe("mission_launch_failed");
    expect(feedback?.message).toContain("vault not configured");
  });
});

describe("deriveApprovalExecutionFeedback — monitor approvals", () => {
  it("shows informational no-mission outcome after approval", () => {
    const feedback = deriveApprovalExecutionFeedback({
      proposal: monitorProposal(),
      liveApiEnabled: true,
    });

    expect(feedback?.kind).toBe("no_mission");
    expect(feedback?.message).toContain("No mission launched");
    expect(feedback?.message).toContain("informational");
  });

  it("shows no mission launched after rejection", () => {
    const feedback = deriveApprovalExecutionFeedback({
      proposal: monitorProposal("rejected"),
      liveApiEnabled: true,
    });

    expect(feedback?.message).toContain("No mission launched");
    expect(feedback?.message).toContain("informational");
  });

  it("shows rejected handoff outcome without implying a mission launched", () => {
    const feedback = deriveApprovalExecutionFeedback({
      proposal: handoffProposal("rejected"),
      liveApiEnabled: true,
    });

    expect(feedback?.message).toContain("No mission launched");
    expect(feedback?.message).toContain("rejected");
  });
});

describe("deriveApprovalExecutionFeedback — mock mode honesty", () => {
  it("does not fabricate launched missions in mock mode", () => {
    const feedback = deriveApprovalExecutionFeedback({
      proposal: handoffProposal(),
      liveApiEnabled: false,
    });

    expect(feedback?.kind).toBe("mock_unavailable");
    expect(feedback?.message).toBe(APPROVAL_EXECUTION_MOCK_NOTE);
  });
});

describe("launchErrorFromApprovalActionMessage", () => {
  it("extracts mission launch errors from approval action feedback", () => {
    const message = launchErrorFromApprovalActionMessage(
      "Approved, but mission did not run: missing project linkage",
      "approved",
    );

    expect(message).toContain("mission did not run");
  });

  it("ignores non-mission errors", () => {
    expect(
      launchErrorFromApprovalActionMessage("Decision could not be recorded — try again.", "approved"),
    ).toBeNull();
  });
});
