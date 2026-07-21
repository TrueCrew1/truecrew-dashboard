import { describe, expect, it } from "vitest";
import { buildChiefLiveContext } from "@/components/chief/chiefLiveContext";
import {
  parseContinueWorkTopic,
  searchAgents,
  searchContinueWork,
  searchDocuments,
  searchEntities,
  searchProjects,
  searchTasks,
  type SearchContext,
} from "@/lib/search/searchService";
import type { MockData } from "@/data/mockData";
import { WorkflowStage } from "@/types";

const NOW = "2026-07-10T12:00:00.000Z";

function fixtureData(overrides: Partial<MockData> = {}): MockData {
  return {
    tasks: [],
    workflows: [],
    incidents: [],
    tools: [],
    deploys: [],
    customers: [],
    runbooks: [],
    prompts: [],
    notes: [],
    alerts: [],
    focusItems: [],
    ...overrides,
  };
}

function buildContext(overrides: Partial<MockData> = {}): SearchContext {
  const data = fixtureData(overrides);
  return {
    data,
    liveContext: buildChiefLiveContext(data),
    approvals: [],
  };
}

describe("searchTasks", () => {
  it("matches on title and returns a working route + entityId", () => {
    const ctx = buildContext({
      tasks: [
        {
          id: "task-quickbooks",
          title: "QuickBooks integration sync",
          description: "Wire the accounting export.",
          stage: WorkflowStage.Triage,
          workflowType: "build",
          priority: "medium",
          gates: [],
          linkedEntities: [],
          createdAt: NOW,
          updatedAt: NOW,
          createdBy: "founder",
        },
      ],
    });

    const results = searchTasks("quickbooks", ctx);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("QuickBooks integration sync");
    expect(results[0].route).toBe("/builds");
    expect(results[0].entityId).toBe("task-quickbooks");
  });

  it("returns nothing when the query matches no task", () => {
    const ctx = buildContext({
      tasks: [
        {
          id: "task-1",
          title: "Replace HVAC filter",
          description: "Routine PM.",
          stage: WorkflowStage.Planned,
          workflowType: "repair",
          priority: "low",
          gates: [],
          linkedEntities: [],
          createdAt: NOW,
          updatedAt: NOW,
          createdBy: "founder",
        },
      ],
    });

    expect(searchTasks("quickbooks", ctx)).toHaveLength(0);
  });

  it("ranks an exact title match above a substring match", () => {
    const ctx = buildContext({
      tasks: [
        {
          id: "task-a",
          title: "Repair",
          description: "",
          stage: WorkflowStage.Planned,
          workflowType: "repair",
          priority: "low",
          gates: [],
          linkedEntities: [],
          createdAt: NOW,
          updatedAt: NOW,
          createdBy: "founder",
        },
        {
          id: "task-b",
          title: "Schedule a repair for the compressor",
          description: "",
          stage: WorkflowStage.Planned,
          workflowType: "repair",
          priority: "low",
          gates: [],
          linkedEntities: [],
          createdAt: NOW,
          updatedAt: NOW,
          createdBy: "founder",
        },
      ],
    });

    const results = searchTasks("repair", ctx);
    expect(results.map((r) => r.entityId)).toEqual(["task-a", "task-b"]);
  });
});

describe("searchProjects", () => {
  it("matches workflows and routes by workflow type", () => {
    const ctx = buildContext({
      workflows: [
        {
          id: "wf-1",
          title: "Compressor overhaul",
          type: "repair",
          stage: WorkflowStage.InProgress,
          owner: "founder",
          summary: "Full teardown and rebuild.",
          gates: [],
          linkedTaskIds: [],
          linkedEntityIds: [],
          createdAt: NOW,
          updatedAt: NOW,
          createdBy: "founder",
        },
      ],
    });

    const results = searchProjects("compressor", ctx);
    expect(results).toHaveLength(1);
    expect(results[0].route).toBe("/repair");
    expect(results[0].entityId).toBe("wf-1");
  });
});

describe("searchDocuments", () => {
  it("merges notes, runbooks, and prompts and routes to /knowledge", () => {
    const ctx = buildContext({
      runbooks: [
        {
          id: "rb-1",
          title: "Compressor restart procedure",
          serviceId: "svc-1",
          serviceName: "Compressor A",
          obsidianPath: "Runbooks/compressor.md",
          summary: "Steps to safely restart after an overload trip.",
          tags: ["compressor", "restart"],
          createdAt: NOW,
          updatedAt: NOW,
          createdBy: "founder",
        },
      ],
    });

    const results = searchDocuments("compressor", ctx);
    expect(results).toHaveLength(1);
    expect(results[0].route).toBe("/knowledge");
    expect(results[0].subtitle).toContain("Runbook");
  });
});

describe("searchAgents", () => {
  it("derives a real Build Agent entry from task gate/blocker state", () => {
    const ctx = buildContext({
      tasks: [
        {
          id: "task-blocked",
          title: "Blocked build task",
          description: "",
          stage: WorkflowStage.InProgress,
          workflowType: "build",
          priority: "high",
          blocker: "Waiting on vendor part",
          gates: [{ id: "g1", label: "Parts ordered", required: true, passed: false }],
          linkedEntities: [],
          createdAt: NOW,
          updatedAt: NOW,
          createdBy: "founder",
        },
      ],
    });

    const results = searchAgents("build agent", ctx);
    expect(results.some((r) => r.title === "Build Agent")).toBe(true);
    const buildAgent = results.find((r) => r.title === "Build Agent")!;
    expect(buildAgent.chiefTab).toBe("agents");
    expect(buildAgent.chiefFilter).toBe("Build Agent");
  });

  it("matches on task text carried by an agent, not just the agent name", () => {
    const ctx = buildContext({
      tasks: [
        {
          id: "task-ms-painting",
          title: "MS Painting improvement plan",
          description: "",
          stage: WorkflowStage.InProgress,
          workflowType: "build",
          priority: "medium",
          gates: [],
          linkedEntities: [],
          createdAt: NOW,
          updatedAt: NOW,
          createdBy: "founder",
        },
      ],
    });

    const results = searchAgents("ms painting", ctx);
    expect(results.some((r) => r.title === "Build Agent")).toBe(true);
  });
});

describe("searchEntities", () => {
  it("returns an empty array for a blank query", () => {
    const ctx = buildContext();
    expect(searchEntities("   ", ctx)).toEqual([]);
  });

  it("omits empty groups rather than returning them with zero items", () => {
    // workflowType "repair" with no gates isn't picked up by any of the
    // agent-derivation functions, so this should only ever produce a
    // "tasks" group — not an empty "agents"/"projects"/"documents" one.
    const ctx = buildContext({
      tasks: [
        {
          id: "task-1",
          title: "Nothing else matches this",
          description: "",
          stage: WorkflowStage.Planned,
          workflowType: "repair",
          priority: "low",
          gates: [],
          linkedEntities: [],
          createdAt: NOW,
          updatedAt: NOW,
          createdBy: "founder",
        },
      ],
    });

    const groups = searchEntities("nothing else matches this", ctx);
    expect(groups.map((g) => g.id)).toEqual(["tasks"]);
  });

  it("puts a matched 'continue work on X' group first", () => {
    const ctx = buildContext({
      tasks: [
        {
          id: "task-qb",
          title: "QuickBooks sync cleanup",
          description: "",
          stage: WorkflowStage.InProgress,
          workflowType: "build",
          priority: "medium",
          gates: [],
          linkedEntities: [],
          createdAt: NOW,
          updatedAt: NOW,
          createdBy: "founder",
        },
      ],
    });

    const groups = searchEntities("continue previous work on QuickBooks", ctx);
    expect(groups[0].id).toBe("continueWork");
  });
});

describe("parseContinueWorkTopic", () => {
  it("extracts the topic from 'continue previous work on X'", () => {
    expect(parseContinueWorkTopic("Continue previous work on QuickBooks")).toBe("QuickBooks");
  });

  it("extracts the topic from 'resume work X'", () => {
    expect(parseContinueWorkTopic("resume work the billing rate limiter")).toBe(
      "the billing rate limiter",
    );
  });

  it("returns null for queries that aren't shaped like a resume request", () => {
    expect(parseContinueWorkTopic("Show agents working on billing")).toBeNull();
  });
});

describe("searchContinueWork", () => {
  it("only matches tasks in an active stage, ranked by recency for ties", () => {
    const ctx = buildContext({
      tasks: [
        {
          id: "task-done",
          title: "QuickBooks export — done",
          description: "",
          stage: WorkflowStage.Done,
          workflowType: "build",
          priority: "low",
          gates: [],
          linkedEntities: [],
          createdAt: NOW,
          updatedAt: "2026-07-01T00:00:00.000Z",
          createdBy: "founder",
        },
        {
          id: "task-older-active",
          title: "QuickBooks export — older",
          description: "",
          stage: WorkflowStage.InProgress,
          workflowType: "build",
          priority: "medium",
          gates: [],
          linkedEntities: [],
          createdAt: NOW,
          updatedAt: "2026-07-05T00:00:00.000Z",
          createdBy: "founder",
        },
        {
          id: "task-newer-active",
          title: "QuickBooks export — newer",
          description: "",
          stage: WorkflowStage.Waiting,
          workflowType: "build",
          priority: "medium",
          gates: [],
          linkedEntities: [],
          createdAt: NOW,
          updatedAt: "2026-07-09T00:00:00.000Z",
          createdBy: "founder",
        },
      ],
    });

    const results = searchContinueWork("QuickBooks", ctx);
    // Done task is excluded; the more recently updated active task ranks first.
    expect(results.map((r) => r.entityId)).toEqual(["task-newer-active", "task-older-active"]);
  });

  it("returns nothing for a blank topic", () => {
    const ctx = buildContext();
    expect(searchContinueWork("   ", ctx)).toEqual([]);
  });
});

describe("scoreMatch via searchTasks (token-order-independent matching)", () => {
  it("matches when query words appear out of order across the field", () => {
    const ctx = buildContext({
      tasks: [
        {
          id: "task-1",
          title: "Billing API rate limiter",
          description: "",
          stage: WorkflowStage.InProgress,
          workflowType: "build",
          priority: "high",
          gates: [],
          linkedEntities: [],
          createdAt: NOW,
          updatedAt: NOW,
          createdBy: "founder",
        },
      ],
    });

    // Words present but not as a contiguous substring, and in a different order.
    const results = searchTasks("rate limiter billing", ctx);
    expect(results).toHaveLength(1);
    expect(results[0].entityId).toBe("task-1");
  });
});
