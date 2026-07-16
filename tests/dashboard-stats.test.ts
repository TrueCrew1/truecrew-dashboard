import { describe, expect, it } from "vitest";
import {
  deriveShiftStats,
  filterIncidentsByShiftParam,
  filterTasksByShiftParam,
  isActiveIncidentStatus,
  isOpenTaskStage,
} from "../lib/queries/dashboard-stats.js";
import { WorkflowStage } from "../src/types/index.js";
import { makeIncident, makeTask } from "./fixtures.js";

const PAST = "2000-01-01T00:00:00.000Z";
const FUTURE = "2999-01-01T00:00:00.000Z";

describe("isOpenTaskStage", () => {
  it("treats workflow stages up to Review as open", () => {
    expect(isOpenTaskStage(WorkflowStage.Inbox)).toBe(true);
    expect(isOpenTaskStage(WorkflowStage.Review)).toBe(true);
  });

  it("treats Done and Logged as closed", () => {
    expect(isOpenTaskStage(WorkflowStage.Done)).toBe(false);
    expect(isOpenTaskStage(WorkflowStage.Logged)).toBe(false);
  });
});

describe("isActiveIncidentStatus", () => {
  it("recognizes active statuses", () => {
    expect(isActiveIncidentStatus("open")).toBe(true);
    expect(isActiveIncidentStatus("mitigating")).toBe(true);
    expect(isActiveIncidentStatus("mitigated")).toBe(true);
  });

  it("treats resolved/post-mortem as inactive", () => {
    expect(isActiveIncidentStatus("resolved")).toBe(false);
    expect(isActiveIncidentStatus("post_mortem_filed")).toBe(false);
  });
});

describe("deriveShiftStats", () => {
  it("counts open work orders, overdue tasks, and active incidents", () => {
    const stats = deriveShiftStats({
      tasks: [
        { workflowType: "repair", stage: WorkflowStage.InProgress },
        { workflowType: "ticket", stage: WorkflowStage.Inbox },
        { workflowType: "build", stage: WorkflowStage.InProgress },
        { workflowType: "repair", stage: WorkflowStage.Done },
        { workflowType: "ticket", stage: WorkflowStage.Planned, dueAt: PAST },
        { workflowType: "repair", stage: WorkflowStage.Planned, dueAt: FUTURE },
      ],
      incidents: [{ status: "open" }, { status: "resolved" }, { status: "mitigating" }],
    });

    expect(stats.openWorkOrders).toBe(4);
    expect(stats.overduePMs).toBe(1);
    expect(stats.activeIncidents).toBe(2);
  });

  it("returns zeros for empty input", () => {
    expect(deriveShiftStats({ tasks: [], incidents: [] })).toEqual({
      openWorkOrders: 0,
      overduePMs: 0,
      activeIncidents: 0,
    });
  });
});

describe("filterTasksByShiftParam", () => {
  const openRepair = makeTask({ id: "r", workflowType: "repair", stage: WorkflowStage.InProgress });
  const closedTicket = makeTask({ id: "t", workflowType: "ticket", stage: WorkflowStage.Done });
  const overdue = makeTask({
    id: "o",
    workflowType: "repair",
    stage: WorkflowStage.Planned,
    dueAt: PAST,
  });
  const tasks = [openRepair, closedTicket, overdue];

  it("filters open work orders", () => {
    const result = filterTasksByShiftParam(tasks, "open-work-orders");
    expect(result.map((t) => t.id).sort()).toEqual(["o", "r"]);
  });

  it("filters overdue PMs", () => {
    expect(filterTasksByShiftParam(tasks, "overdue-pms").map((t) => t.id)).toEqual(["o"]);
  });

  it("returns all tasks for an unrecognized filter", () => {
    expect(filterTasksByShiftParam(tasks, null)).toHaveLength(3);
    expect(filterTasksByShiftParam(tasks, "bogus")).toHaveLength(3);
  });
});

describe("filterIncidentsByShiftParam", () => {
  const incidents = [
    makeIncident({ id: "a", status: "open" }),
    makeIncident({ id: "b", status: "resolved" }),
  ];

  it("filters active incidents", () => {
    expect(filterIncidentsByShiftParam(incidents, "active-incidents").map((i) => i.id)).toEqual([
      "a",
    ]);
  });

  it("returns all incidents for other filters", () => {
    expect(filterIncidentsByShiftParam(incidents, null)).toHaveLength(2);
  });
});
