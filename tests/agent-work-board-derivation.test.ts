import { describe, expect, it } from "vitest";
import {
  deriveRoadmapAgentWorkItems,
  deriveWorkflowGateAgentWorkItems,
} from "@/components/chief/chiefLiveContext";
import { WorkflowStage, type Task } from "@/types";

function task(overrides: Partial<Task> & Pick<Task, "id" | "title" | "workflowType">): Task {
  return {
    description: "",
    stage: WorkflowStage.InProgress,
    priority: "medium",
    assignee: "operator",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T11:00:00.000Z",
    createdBy: "operator",
    gates: [{ id: "g1", label: "Gate", required: true, passed: false }],
    linkedEntities: [],
    ...overrides,
  };
}

describe("deriveRoadmapAgentWorkItems", () => {
  it("maps decision tasks to Roadmap Agent live rows", () => {
    const items = deriveRoadmapAgentWorkItems([
      task({ id: "d1", title: "Pricing decision", workflowType: "decision" }),
      task({ id: "b1", title: "Build work", workflowType: "build" }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      agent: "Roadmap Agent",
      task: "Pricing decision",
      source: "live",
      status: "blocked",
    });
  });
});

describe("deriveWorkflowGateAgentWorkItems", () => {
  it("excludes build and decision tasks so Roadmap/Build own those lanes", () => {
    const items = deriveWorkflowGateAgentWorkItems([
      task({ id: "d1", title: "Pricing decision", workflowType: "decision" }),
      task({ id: "b1", title: "Build work", workflowType: "build" }),
      task({ id: "r1", title: "Repair intake", workflowType: "repair" }),
      task({
        id: "o1",
        title: "Onboarding without gates",
        workflowType: "onboarding",
        gates: [],
      }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      agent: "Workflow Gate Agent",
      task: "Repair intake",
      source: "live",
    });
  });
});
