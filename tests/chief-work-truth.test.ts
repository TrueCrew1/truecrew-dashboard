import { describe, expect, it } from "vitest";
import {
  guardCommandResultWorkTruth,
  isExecutableMissionKind,
  isOperatorVisibleWorkTruth,
} from "../lib/chief/workTruth.js";
import { resolveChiefCommand } from "../lib/chief/resolveCommand.js";
import type { ChiefCommandLiveContext } from "../lib/chief/commandTypes.js";
import { RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND } from "../lib/missions/types.js";

const emptyCtx: ChiefCommandLiveContext = {
  stats: { openWorkOrders: 0, overduePMs: 0 },
  focusItems: [],
  alerts: [],
  openTaskCount: 1,
  blockingTasks: [],
  overdueTasks: [],
  tasksMissingCustomer: [],
  tasksMissingWorkflow: [],
  activeIncidents: [],
  blockedDeploys: [],
  waitingCustomers: [],
};

describe("Chief work truth", () => {
  it("hides stubs from operator visibility by default", () => {
    expect(isOperatorVisibleWorkTruth("stub")).toBe(false);
    expect(isOperatorVisibleWorkTruth("executable")).toBe(true);
    expect(isOperatorVisibleWorkTruth("grounded")).toBe(true);
    expect(isOperatorVisibleWorkTruth("informational")).toBe(false);
  });

  it("recognizes executable mission kinds", () => {
    expect(isExecutableMissionKind(RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND)).toBe(true);
    expect(isExecutableMissionKind("not-a-mission")).toBe(false);
  });

  it("strips approvalNeeded when no mission is present", () => {
    const guarded = guardCommandResultWorkTruth({
      approvalNeeded: true,
      approvalTitle: "Fake",
      approvalPrompt: "Do it?",
      workTruth: "informational" as const,
    });
    expect(guarded.approvalNeeded).toBe(false);
    expect(guarded.approvalTitle).toBeUndefined();
  });

  it("keeps executable mission approvals", () => {
    const guarded = guardCommandResultWorkTruth({
      approvalNeeded: true,
      missionKind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
      missionProjectId: "inc-1",
    });
    expect(guarded.approvalNeeded).toBe(true);
    expect(guarded.workTruth).toBe("executable");
  });

  it("does not mark blocker status as approvalNeeded", () => {
    const result = resolveChiefCommand({
      prompt: "What's blocked?",
      liveContext: emptyCtx,
      knowledge: { runbooks: [], prompts: [], notes: [] },
      approvals: [],
    });
    expect(result.matched).toBe(true);
    expect(result.approvalNeeded).toBeFalsy();
    expect(result.workTruth).toBe("informational");
  });

  it("marks postmortem command as executable", () => {
    const result = resolveChiefCommand({
      prompt: "Propose a postmortem for the active incident",
      liveContext: {
        ...emptyCtx,
        activeIncidents: [
          {
            id: "inc-9",
            title: "Outage",
            summary: "Down",
            serviceId: "svc-1",
            serviceName: "API",
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
    expect(result.workTruth).toBe("executable");
    expect(result.approvalNeeded).toBe(true);
    expect(result.missionKind).toBe(RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND);
  });
});
