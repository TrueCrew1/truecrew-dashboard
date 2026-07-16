import { describe, expect, it } from "vitest";
import {
  applyTaskWarningView,
  deriveTaskWarnings,
  derivePrimaryTaskWarning,
  filterTasksByWarningKind,
  getOpenRequiredGates,
  getPrimaryWarningKind,
  sortTasksWithWarningsFirst,
  summarizeTaskWarnings,
  taskHasWarning,
} from "../lib/task-warnings.js";
import { WorkflowStage } from "../src/types/index.js";
import { makeCustomer, makeGate, makeTask } from "./fixtures.js";

const PAST = "2000-01-01T00:00:00.000Z";
const FUTURE = "2999-01-01T00:00:00.000Z";

describe("getOpenRequiredGates", () => {
  it("keeps only required, unpassed gates", () => {
    const gates = [
      makeGate({ id: "a", required: true, passed: false }),
      makeGate({ id: "b", required: true, passed: true }),
      makeGate({ id: "c", required: false, passed: false }),
    ];
    expect(getOpenRequiredGates(gates).map((g) => g.id)).toEqual(["a"]);
  });
});

describe("deriveTaskWarnings", () => {
  it("returns no warnings for a clean in-progress task", () => {
    const task = makeTask({ workflowType: "repair", dueAt: FUTURE });
    expect(deriveTaskWarnings(task)).toEqual([]);
  });

  it("flags a blocker as an external dependency", () => {
    const task = makeTask({ blocker: "Waiting on vendor part" });
    const warnings = deriveTaskWarnings(task);
    expect(warnings[0].kind).toBe("external_dependency");
    expect(warnings[0].detail).toBe("Waiting on vendor part");
  });

  it("flags a past-due open task", () => {
    const task = makeTask({ dueAt: PAST, stage: WorkflowStage.InProgress });
    expect(deriveTaskWarnings(task).some((w) => w.kind === "time_gate")).toBe(true);
  });

  it("does not flag past due for a closed task", () => {
    const task = makeTask({ dueAt: PAST, stage: WorkflowStage.Done });
    expect(deriveTaskWarnings(task).some((w) => w.kind === "time_gate")).toBe(false);
  });

  it("flags open required gates and pluralizes multi-gate labels", () => {
    const task = makeTask({
      gates: [
        makeGate({ id: "g1", label: "CI green", required: true, passed: false }),
        makeGate({ id: "g2", label: "PR approved", required: true, passed: false }),
      ],
    });
    const gateWarning = deriveTaskWarnings(task).find((w) => w.kind === "gate_open");
    expect(gateWarning?.label).toContain("Gates open (2)");
    expect(gateWarning?.detail).toBe("CI green · PR approved");
  });

  it("flags a missing customer link for customer-facing tasks", () => {
    const task = makeTask({ workflowType: "ticket", dueAt: FUTURE });
    const context = { customers: [makeCustomer()], workflows: [] };
    expect(deriveTaskWarnings(task, context).some((w) => w.kind === "missing_data")).toBe(true);
  });

  it("flags a waiting task with no recorded blocker", () => {
    const task = makeTask({ stage: WorkflowStage.Waiting, dueAt: FUTURE });
    expect(deriveTaskWarnings(task).some((w) => w.kind === "waiting")).toBe(true);
  });

  it("does not raise a waiting warning when a blocker is present", () => {
    const task = makeTask({ stage: WorkflowStage.Waiting, blocker: "Vendor", dueAt: FUTURE });
    expect(deriveTaskWarnings(task).some((w) => w.kind === "waiting")).toBe(false);
  });

  it("flags a build task with no GitHub ref", () => {
    const task = makeTask({ workflowType: "build", stage: WorkflowStage.InProgress, dueAt: FUTURE });
    expect(deriveTaskWarnings(task).some((w) => w.kind === "readiness")).toBe(true);
  });

  it("does not flag readiness when a github-related gate already covers it", () => {
    const task = makeTask({
      workflowType: "build",
      stage: WorkflowStage.InProgress,
      dueAt: FUTURE,
      gates: [makeGate({ label: "GitHub branch linked", required: true, passed: false })],
    });
    expect(deriveTaskWarnings(task).some((w) => w.kind === "readiness")).toBe(false);
  });

  it("orders warnings by priority (blocker before gates)", () => {
    const task = makeTask({
      blocker: "Vendor",
      gates: [makeGate({ required: true, passed: false })],
    });
    expect(deriveTaskWarnings(task).map((w) => w.kind)).toEqual([
      "external_dependency",
      "gate_open",
    ]);
  });
});

describe("primary-warning helpers", () => {
  const warned = makeTask({ id: "warned", blocker: "Vendor" });
  const clean = makeTask({ id: "clean", dueAt: FUTURE });

  it("derivePrimaryTaskWarning returns the highest-priority warning", () => {
    expect(derivePrimaryTaskWarning(warned)?.kind).toBe("external_dependency");
    expect(derivePrimaryTaskWarning(clean)).toBeNull();
  });

  it("taskHasWarning reflects presence of a warning", () => {
    expect(taskHasWarning(warned)).toBe(true);
    expect(taskHasWarning(clean)).toBe(false);
  });

  it("getPrimaryWarningKind returns the kind or null", () => {
    expect(getPrimaryWarningKind(warned)).toBe("external_dependency");
    expect(getPrimaryWarningKind(clean)).toBeNull();
  });
});

describe("filtering and sorting", () => {
  const blocked = makeTask({ id: "blocked", blocker: "Vendor" });
  const clean = makeTask({ id: "clean", dueAt: FUTURE });

  it("filterTasksByWarningKind returns all tasks when kind is null", () => {
    expect(filterTasksByWarningKind([blocked, clean], null)).toHaveLength(2);
  });

  it("filterTasksByWarningKind keeps only tasks whose primary warning matches", () => {
    const result = filterTasksByWarningKind([blocked, clean], "external_dependency");
    expect(result.map((t) => t.id)).toEqual(["blocked"]);
  });

  it("sortTasksWithWarningsFirst is a stable warned-first sort", () => {
    const result = sortTasksWithWarningsFirst([clean, blocked]);
    expect(result.map((t) => t.id)).toEqual(["blocked", "clean"]);
  });

  it("applyTaskWarningView filters then sorts", () => {
    const result = applyTaskWarningView([clean, blocked], null);
    expect(result.map((t) => t.id)).toEqual(["blocked", "clean"]);
  });
});

describe("summarizeTaskWarnings", () => {
  it("counts warned tasks by primary warning kind", () => {
    const tasks = [
      makeTask({ id: "1", blocker: "Vendor" }),
      makeTask({ id: "2", stage: WorkflowStage.Waiting, dueAt: FUTURE }),
      makeTask({ id: "3", dueAt: FUTURE }),
    ];
    const summary = summarizeTaskWarnings(tasks);
    expect(summary.totalTasks).toBe(3);
    expect(summary.warnedTasks).toBe(2);
    expect(summary.byKind.external_dependency).toBe(1);
    expect(summary.byKind.waiting).toBe(1);
  });
});
