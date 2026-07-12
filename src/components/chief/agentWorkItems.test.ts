import { describe, expect, it } from "vitest";
import { WorkflowStage } from "@/types";
import type { Incident, Task } from "@/types";
import type { PlannerWorkItem } from "@/types/plannerWorkItems";
import { combineAgentWorkItems } from "./agentWorkItems";
import type { ApprovalProposal } from "./types";

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Ship the widget",
    description: "",
    stage: WorkflowStage.InProgress,
    workflowType: "build",
    priority: "medium",
    createdBy: "founder",
    gates: [],
    linkedEntities: [],
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    ...overrides,
  } as Task;
}

function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: "incident-1",
    title: "API latency spike",
    severity: 2,
    status: "open",
    serviceId: "svc-1",
    serviceName: "API",
    summary: "Elevated latency on the API service.",
    openedAt: "2026-07-10T00:00:00.000Z",
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    createdBy: "founder",
    ...overrides,
  } as Incident;
}

function pendingApproval(overrides: Partial<ApprovalProposal> = {}): ApprovalProposal {
  return {
    id: "proposal-1",
    title: "Approve plan",
    summary: "Ready for review.",
    recommendedAction: "approve",
    riskNote: "Low risk.",
    status: "pending",
    createdAt: "2026-07-10T00:00:00.000Z",
    source: "planner_agent",
    ...overrides,
  };
}

function plannerReadyBuildWorkItem(overrides: Partial<PlannerWorkItem> = {}): PlannerWorkItem {
  return {
    id: "planner-work-1",
    title: "Wire the settings page",
    description: "Backend route exists; needs UI.",
    status: "new",
    priority: "medium",
    assignee: null,
    dueDate: null,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("combineAgentWorkItems", () => {
  it("merges every live source and defaults mockItems to the mock roster", () => {
    const items = combineAgentWorkItems({
      tasks: [buildTask()],
      incidents: [incident()],
      plannerWorkItems: [],
      plannerReadyBuildWorkItems: [],
      librarianWorkItems: [],
      approvals: [pendingApproval()],
    });

    const agents = items.map((item) => item.agent).sort();
    expect(agents).toContain("Build Agent");
    expect(agents).toContain("Research Agent");
    expect(agents).toContain("Roadmap Agent");
    expect(agents).toContain("Marketer Agent");
    expect(agents).toContain("Competitive Research Agent");
  });

  it("uses an explicit mockItems override instead of the default roster", () => {
    const items = combineAgentWorkItems({
      tasks: [],
      incidents: [],
      plannerWorkItems: [],
      plannerReadyBuildWorkItems: [],
      librarianWorkItems: [],
      approvals: [],
      mockItems: [],
    });

    expect(items).toEqual([]);
  });

  it("surfaces planner_work_items as live Build Agent rows", () => {
    const items = combineAgentWorkItems({
      tasks: [],
      incidents: [],
      plannerWorkItems: [],
      plannerReadyBuildWorkItems: [plannerReadyBuildWorkItem()],
      librarianWorkItems: [],
      approvals: [],
      mockItems: [],
    });

    expect(items).toEqual([
      {
        id: "agentwork-planner-build-planner-work-1",
        agent: "Build Agent",
        task: "Build: Wire the settings page",
        status: "queued",
        priority: "medium",
        note: "Backend route exists; needs UI.",
        updatedAt: "2026-07-10T00:00:00.000Z",
        source: "live",
      },
    ]);
  });
});
