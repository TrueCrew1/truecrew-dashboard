import { describe, expect, it } from "vitest";
import { WorkflowStage } from "@/types";
import type { Task } from "@/types";
import type { PlannerWorkItem } from "@/types/plannerWorkItems";
import { deriveAgentActivityTimeline, recentActivityForAgent } from "./agentActivityFeed";
import type { AgentActivityItem } from "./agentActivityFeed";

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Ship the widget",
    description: "",
    stage: WorkflowStage.Inbox,
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

function plannerItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "wi-1",
    inputPayload: { title: "Plan phase 4" },
    status: "queued",
    updatedAt: "2026-07-10T01:00:00.000Z",
    latestObsidianPath: null,
    ...overrides,
  };
}

function librarianItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "wi-2",
    inputPayload: { title: "File decision" },
    status: "completed",
    updatedAt: "2026-07-10T02:00:00.000Z",
    latestObsidianPath: "Operations/decision.md",
    ...overrides,
  };
}

function plannerReadyBuildItem(overrides: Partial<PlannerWorkItem> = {}): PlannerWorkItem {
  return {
    id: "planner-work-1",
    title: "Wire the settings page",
    description: "Backend route exists; needs UI.",
    status: "new",
    priority: "medium",
    assignee: null,
    dueDate: null,
    createdAt: "2026-07-10T03:00:00.000Z",
    updatedAt: "2026-07-10T03:00:00.000Z",
    ...overrides,
  };
}

describe("deriveAgentActivityTimeline", () => {
  it("emits a created event for every build task", () => {
    const timeline = deriveAgentActivityTimeline({
      tasks: [buildTask()],
      plannerWorkItems: [],
      plannerReadyBuildWorkItems: [],
      librarianWorkItems: [],
      mockItems: [],
    });

    expect(timeline).toEqual([
      {
        id: "activity-build-created-task-1",
        agent: "Build Agent",
        activityType: "created",
        description: "Build Agent created task: Ship the widget",
        timestamp: "2026-07-10T00:00:00.000Z",
        source: "live",
      },
    ]);
  });

  it("adds a status event only once a build task has changed since creation", () => {
    const untouched = deriveAgentActivityTimeline({
      tasks: [buildTask({ id: "untouched" })],
      plannerWorkItems: [],
      plannerReadyBuildWorkItems: [],
      librarianWorkItems: [],
      mockItems: [],
    });
    expect(untouched).toHaveLength(1);
    expect(untouched[0].activityType).toBe("created");

    const changed = deriveAgentActivityTimeline({
      tasks: [
        buildTask({
          id: "changed",
          stage: WorkflowStage.Done,
          updatedAt: "2026-07-10T05:00:00.000Z",
        }),
      ],
      plannerWorkItems: [],
      plannerReadyBuildWorkItems: [],
      librarianWorkItems: [],
      mockItems: [],
    });
    expect(changed).toHaveLength(2);
    expect(changed.map((item) => item.activityType).sort()).toEqual(["completed", "created"]);
  });

  it("maps planner and librarian work items to labeled activity entries", () => {
    const timeline = deriveAgentActivityTimeline({
      tasks: [],
      plannerWorkItems: [plannerItem()],
      plannerReadyBuildWorkItems: [],
      librarianWorkItems: [librarianItem()],
      mockItems: [],
    });

    expect(timeline).toEqual([
      {
        id: "activity-agentwork-librarian-wi-2",
        agent: "Librarian Agent",
        activityType: "completed",
        description: "Librarian Agent completed: File decision: File decision",
        timestamp: "2026-07-10T02:00:00.000Z",
        source: "live",
      },
      {
        id: "activity-agentwork-planner-wi-1",
        agent: "Roadmap Agent",
        activityType: "queued",
        description: "Roadmap Agent queued: Plan: Plan phase 4",
        timestamp: "2026-07-10T01:00:00.000Z",
        source: "live",
      },
    ]);
  });

  it("maps planner-ready build work items to labeled Build Agent activity entries", () => {
    const timeline = deriveAgentActivityTimeline({
      tasks: [],
      plannerWorkItems: [],
      plannerReadyBuildWorkItems: [plannerReadyBuildItem()],
      librarianWorkItems: [],
      mockItems: [],
    });

    expect(timeline).toEqual([
      {
        id: "activity-agentwork-planner-build-planner-work-1",
        agent: "Build Agent",
        activityType: "queued",
        description: "Build Agent queued: Build: Wire the settings page",
        timestamp: "2026-07-10T03:00:00.000Z",
        source: "live",
      },
    ]);
  });

  it("includes mock items tagged with source mock", () => {
    const timeline = deriveAgentActivityTimeline({
      tasks: [],
      plannerWorkItems: [],
      plannerReadyBuildWorkItems: [],
      librarianWorkItems: [],
      mockItems: [
        {
          id: "agentwork-competitive-research-1",
          agent: "Competitive Research Agent",
          task: "Draft competitive analysis outline",
          status: "queued",
          priority: "medium",
          note: "Mock research agent work item — local only.",
          updatedAt: "2026-07-11T00:00:00.000Z",
          source: "mock",
        },
      ],
    });

    expect(timeline).toEqual([
      {
        id: "activity-agentwork-competitive-research-1",
        agent: "Competitive Research Agent",
        activityType: "queued",
        description: "Competitive Research Agent queued: Draft competitive analysis outline",
        timestamp: "2026-07-11T00:00:00.000Z",
        source: "mock",
      },
    ]);
  });

  it("sorts entries newest first across all sources", () => {
    const timeline = deriveAgentActivityTimeline({
      tasks: [buildTask({ id: "t1", createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" })],
      plannerWorkItems: [plannerItem({ updatedAt: "2026-07-15T00:00:00.000Z" })],
      plannerReadyBuildWorkItems: [],
      librarianWorkItems: [librarianItem({ updatedAt: "2026-07-05T00:00:00.000Z" })],
      mockItems: [],
    });

    const timestamps = timeline.map((item) => item.timestamp);
    expect(timestamps).toEqual([...timestamps].sort().reverse());
  });
});

function activityItem(overrides: Partial<AgentActivityItem> = {}): AgentActivityItem {
  return {
    id: "activity-1",
    agent: "Build Agent",
    activityType: "queued",
    description: "Build Agent queued: Ship the widget",
    timestamp: "2026-07-10T00:00:00.000Z",
    source: "live",
    ...overrides,
  };
}

describe("recentActivityForAgent", () => {
  it("returns only the requested agent's entries, in their existing order", () => {
    const feed = [
      activityItem({ id: "a1", agent: "Build Agent", timestamp: "2026-07-10T03:00:00.000Z" }),
      activityItem({ id: "a2", agent: "Roadmap Agent", timestamp: "2026-07-10T02:00:00.000Z" }),
      activityItem({ id: "a3", agent: "Build Agent", timestamp: "2026-07-10T01:00:00.000Z" }),
    ];

    expect(recentActivityForAgent(feed, "Build Agent").map((item) => item.id)).toEqual([
      "a1",
      "a3",
    ]);
  });

  it("returns an empty list for an agent with no activity", () => {
    const feed = [activityItem({ agent: "Build Agent" })];

    expect(recentActivityForAgent(feed, "Librarian Agent")).toEqual([]);
  });

  it("caps the result at the given limit", () => {
    const feed = Array.from({ length: 20 }, (_, i) =>
      activityItem({ id: `a${i}`, agent: "Build Agent" }),
    );

    expect(recentActivityForAgent(feed, "Build Agent", 3)).toHaveLength(3);
  });
});
