import { describe, expect, it } from "vitest";
import { parseHandoffContent } from "../lib/research/projectSummaryHandoffFormat.js";
import {
  buildResearchProjectSummaryHandoffRequest,
  hasPendingResearchProjectSummaryHandoffProposal,
  researchProjectSummaryHandoffProposalId,
} from "../src/components/chief/researchProjectSummaryHandoff";
import type { ApprovalProposal } from "../src/components/chief/types";
import type { Workflow } from "../src/types";

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

describe("parseHandoffContent", () => {
  it("parses valid JSON from the LLM", () => {
    const parsed = parseHandoffContent(
      JSON.stringify({
        operationalSummary: "Build is in progress with one linked task.",
        keyRisks: ["Gate checks still open"],
        openQuestions: ["Is invoice PDF in scope for this cut?"],
        buildHandoffNotes: "Start with the rate limiter task.",
        recommendedNextBuildStep: "Close open gates on task-001 before merge.",
      }),
    );

    expect(parsed.operationalSummary).toContain("in progress");
    expect(parsed.keyRisks).toHaveLength(1);
    expect(parsed.recommendedNextBuildStep).toContain("task-001");
  });

  it("rejects invalid JSON", () => {
    expect(() => parseHandoffContent("not json")).toThrow(/valid JSON/i);
  });
});

describe("researchProjectSummaryHandoff proposal", () => {
  it("uses a stable proposal id per workflow", () => {
    const first = researchProjectSummaryHandoffProposalId("wf-001");
    const second = researchProjectSummaryHandoffProposalId("wf-001");
    expect(first).toBe(second);
    expect(first.startsWith("apr-research-psh-")).toBe(true);
  });

  it("encodes mission metadata on the request", () => {
    const request = buildResearchProjectSummaryHandoffRequest(sampleWorkflow);
    expect(request.missionKind).toBe("research:project-summary-handoff");
    expect(request.missionProjectId).toBe("wf-001");
  });

  it("dedupes pending proposals for the same workflow", () => {
    const proposalId = researchProjectSummaryHandoffProposalId(sampleWorkflow.id);
    const approvals: ApprovalProposal[] = [
      {
        id: proposalId,
        title: "Research",
        summary: "pending",
        recommendedAction: "approve",
        riskNote: "low",
        status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
        missionKind: "research:project-summary-handoff",
        missionProjectId: sampleWorkflow.id,
      },
    ];

    expect(hasPendingResearchProjectSummaryHandoffProposal(approvals, sampleWorkflow.id)).toBe(
      true,
    );
  });
});
