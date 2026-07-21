import { describe, expect, it } from "vitest";
import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
} from "../lib/missions/types.js";
import { resolveChiefCommand } from "../lib/chief/resolveCommand.js";
import type { ChiefCommandLiveContext } from "../lib/chief/commandTypes.js";

const emptyCtx: ChiefCommandLiveContext = {
  stats: { openWorkOrders: 0, overduePMs: 0 },
  focusItems: [],
  alerts: [],
  openTaskCount: 3,
  blockingTasks: [],
  overdueTasks: [],
  tasksMissingCustomer: [],
  tasksMissingWorkflow: [],
  activeIncidents: [],
  blockedDeploys: [],
  waitingCustomers: [],
};

describe("resolveChiefCommand", () => {
  it("marks unmatched prompts as matched:false", () => {
    const result = resolveChiefCommand({
      prompt: "tell me a joke about valves",
      liveContext: emptyCtx,
      knowledge: { runbooks: [], prompts: [], notes: [] },
      approvals: [],
    });
    expect(result.matched).toBe(false);
    expect(result.resolution).toBe("deterministic");
  });

  it("matches risk/status queries", () => {
    const result = resolveChiefCommand({
      prompt: "What is at risk today?",
      liveContext: emptyCtx,
      knowledge: { runbooks: [], prompts: [], notes: [] },
      approvals: [],
    });
    expect(result.matched).toBe(true);
    expect(result.routedTo).toBe("Chief");
  });

  it("proposes postmortem mission when incident exists", () => {
    const result = resolveChiefCommand({
      prompt: "Propose a postmortem for the active incident",
      liveContext: {
        ...emptyCtx,
        activeIncidents: [
          {
            id: "inc-1",
            title: "Pump outage",
            summary: "Line down",
            serviceId: "svc-1",
            serviceName: "Line A",
            severity: 1,
            status: "open",
            openedAt: "2026-01-01T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            createdBy: "founder",
          },
        ],
      },
      knowledge: { runbooks: [], prompts: [], notes: [] },
      approvals: [],
    });
    expect(result.matched).toBe(true);
    expect(result.approvalNeeded).toBe(true);
    expect(result.missionKind).toBe(RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND);
    expect(result.missionProjectId).toBe("inc-1");
  });

  it("proposes handoff mission when workflow exists", () => {
    const result = resolveChiefCommand({
      prompt: "Propose a project summary handoff",
      liveContext: emptyCtx,
      knowledge: { runbooks: [], prompts: [], notes: [] },
      approvals: [],
      workflows: [
        {
          id: "wf-1",
          title: "Bay retrofit",
          stage: "In Progress",
          owner: "founder",
          summary: "Retrofit bay 3",
          linkedTaskIds: ["t1"],
        },
      ],
    });
    expect(result.matched).toBe(true);
    expect(result.approvalNeeded).toBe(true);
    expect(result.missionKind).toBe(RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND);
    expect(result.missionProjectId).toBe("wf-1");
  });
});
