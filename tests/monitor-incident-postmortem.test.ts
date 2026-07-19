import { describe, expect, it } from "vitest";
import { RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND } from "../lib/missions/types";
import {
  buildMonitorIncidentPostmortemPrompt,
  parsePostmortemContent,
  postmortemArtifactJsonPath,
  postmortemNotePath,
} from "../lib/research/monitorIncidentPostmortemFormat";
import { buildResearchIncidentRequest, researchIncidentProposalId } from "@/components/chief/researchIncidentProposal";
import {
  deriveApprovalResultLinks,
  monitorIncidentPostmortemMissionRecordPath,
} from "@/components/chief/approvalResultLinks";
import { deriveApprovalExecutionFeedback } from "@/components/chief/approvalExecutionFeedback";
import type { Incident } from "@/types";

const incident: Incident = {
  id: "inc-001",
  title: "Auth latency spike",
  severity: 2,
  status: "mitigating",
  serviceId: "svc-auth",
  serviceName: "Auth API",
  summary: "Elevated p95 latency on login path.",
  openedAt: "2026-07-01T10:00:00.000Z",
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
};

describe("parsePostmortemContent", () => {
  it("parses valid JSON from the LLM", () => {
    const parsed = parsePostmortemContent(
      JSON.stringify({
        incidentSummary: "Auth latency elevated during peak traffic.",
        likelyCauses: ["Downstream DB pool saturation"],
        impacts: ["Slower operator logins"],
        recommendedActions: ["Scale auth pool", "Review connection limits"],
        followUpNotes: "Monitor for 24h after mitigation.",
      }),
    );

    expect(parsed.incidentSummary).toContain("latency");
    expect(parsed.likelyCauses).toHaveLength(1);
    expect(parsed.recommendedActions).toHaveLength(2);
  });

  it("rejects invalid JSON", () => {
    expect(() => parsePostmortemContent("not json")).toThrow(/valid JSON/i);
  });
});

describe("buildMonitorIncidentPostmortemPrompt", () => {
  it("includes incident identifiers in the prompt", () => {
    const prompt = buildMonitorIncidentPostmortemPrompt({
      id: incident.id,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      serviceName: incident.serviceName,
      summary: incident.summary,
      openedAt: incident.openedAt,
    });

    expect(prompt).toContain(incident.id);
    expect(prompt).toContain(incident.serviceName);
  });
});

describe("research incident approval request", () => {
  it("attaches the monitor incident postmortem mission kind", () => {
    const request = buildResearchIncidentRequest(incident);
    expect(request.missionKind).toBe(RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND);
    expect(request.missionProjectId).toBe(incident.id);
    expect(request.id).toBe(researchIncidentProposalId(incident.id));
  });
});

describe("postmortem result links and execution feedback", () => {
  const proposalId = researchIncidentProposalId("inc-001");

  it("shows postmortem refs when mission completed with outputs", () => {
    const links = deriveApprovalResultLinks({
      liveApiEnabled: true,
      missionKind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
      mission: {
        id: "mip-1",
        kind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
        status: "completed",
        incidentId: "inc-001",
        incidentTitle: incident.title,
        serviceName: incident.serviceName,
        proposalId,
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T11:00:00.000Z",
        outputNotePath: postmortemNotePath(incident.title),
        handoffArtifactPath: postmortemArtifactJsonPath("mip-1"),
      },
    });

    expect(links.some((link) => link.path === monitorIncidentPostmortemMissionRecordPath("mip-1"))).toBe(
      true,
    );
    expect(links.some((link) => link.label === "Postmortem note")).toBe(true);
  });

  it("reports blocked mission state without implying completion", () => {
    const feedback = deriveApprovalExecutionFeedback({
      proposal: {
        id: proposalId,
        title: "Research: Monitor incident postmortem",
        summary: "Postmortem",
        recommendedAction: "Approve",
        riskNote: "Medium",
        status: "approved",
        createdAt: "2026-07-01T10:00:00.000Z",
        missionKind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
        missionProjectId: incident.id,
      },
      liveApiEnabled: true,
      mission: {
        id: "mip-2",
        kind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
        status: "blocked",
        incidentId: incident.id,
        incidentTitle: incident.title,
        serviceName: incident.serviceName,
        proposalId,
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T11:00:00.000Z",
        error: "LLM unavailable",
      },
    });

    expect(feedback?.kind).toBe("mission_blocked");
    expect(feedback?.message).not.toContain("completed");
  });
});
