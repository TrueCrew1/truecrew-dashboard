import { describe, expect, it } from "vitest";
import type { DbTaskRow } from "../supabase/admin.js";
import { buildKpiSummary, buildWorkOrderRows } from "./workOrderTasks.js";

const NOW = new Date("2026-07-07T12:00:00.000Z");

function task(overrides: Partial<DbTaskRow> = {}): DbTaskRow {
  return {
    id: "task-1",
    legacy_id: null,
    title: "Pump seal replacement",
    description: "",
    stage: "In Progress",
    workflow_type: "repair",
    priority: "high",
    assignee: "crew-a",
    due_at: null,
    blocker: null,
    github_ref: null,
    github_repo: null,
    github_issue_number: null,
    github_pr_number: null,
    github_head_sha: null,
    obsidian_note_id: null,
    created_by: "founder",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    gate_checks: null,
    ...overrides,
  };
}

describe("buildKpiSummary", () => {
  it("counts open, overdue, due-today, in-progress, and completed-today tasks", () => {
    const tasks = [
      task({ id: "t1", stage: "In Progress" }),
      task({ id: "t2", stage: "Inbox", due_at: "2026-07-06T00:00:00.000Z" }), // overdue
      task({ id: "t3", stage: "Planned", due_at: "2026-07-07T18:00:00.000Z" }), // due today
      task({ id: "t4", stage: "Done", updated_at: "2026-07-07T09:00:00.000Z" }), // completed today
      task({ id: "t5", stage: "Logged", updated_at: "2026-07-01T00:00:00.000Z" }), // not today
    ];

    const kpi = buildKpiSummary(tasks, NOW);

    expect(kpi.open_count).toBe(3); // t1 (In Progress) + t2 (Inbox) + t3 (Planned)
    expect(kpi.overdue_count).toBe(1); // t2
    expect(kpi.due_today_count).toBe(1); // t3
    expect(kpi.in_progress_count).toBe(1); // t1
    expect(kpi.completed_today_count).toBe(1); // t4
    expect(kpi.crews_on_shift_count).toBe(0);
    expect(kpi.waiting_approval_count).toBe(0);
  });

  it("returns all zeros for an empty task list", () => {
    const kpi = buildKpiSummary([], NOW);

    expect(kpi.open_count).toBe(0);
    expect(kpi.overdue_count).toBe(0);
    expect(kpi.due_today_count).toBe(0);
    expect(kpi.in_progress_count).toBe(0);
    expect(kpi.completed_today_count).toBe(0);
  });

  it("counts due_today for Done tasks even though they are excluded from rows", () => {
    const tasks = [
      task({
        id: "t-done",
        stage: "Done",
        due_at: "2026-07-07T09:00:00.000Z",
        updated_at: "2026-07-07T10:00:00.000Z",
      }),
    ];

    expect(buildKpiSummary(tasks, NOW).due_today_count).toBe(1);
    expect(buildWorkOrderRows(tasks, NOW)).toHaveLength(0);
  });
});

describe("buildWorkOrderRows", () => {
  it("maps stage/priority vocabulary and derives row flags without fabricating unsupported fields", () => {
    const rows = buildWorkOrderRows(
      [
        task({
          id: "t1",
          stage: "In Progress",
          priority: "medium",
          assignee: null,
          blocker: "Awaiting parts",
        }),
        task({
          id: "t2",
          stage: "Inbox",
          priority: "critical",
          due_at: "2026-07-06T00:00:00.000Z",
        }),
      ],
      NOW,
    );

    expect(rows).toHaveLength(2);

    expect(rows[0]).toMatchObject({
      id: "t1",
      status: "in_progress",
      priority: "normal", // "medium" maps to "normal"
      unassigned: true,
      blocked: true,
      site_name: null,
      asset_name: null,
      crew_name: null,
      scheduled_start: null,
      scheduled_end: null,
    });

    expect(rows[1]).toMatchObject({
      id: "t2",
      status: "open",
      priority: "critical",
      overdue: true,
      unassigned: false,
      blocked: false,
    });
  });

  it("excludes Done/Logged tasks from row output", () => {
    const rows = buildWorkOrderRows(
      [
        task({ id: "t1", stage: "In Progress" }),
        task({ id: "t2", stage: "Done", updated_at: "2026-07-07T09:00:00.000Z" }),
      ],
      NOW,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("t1");
  });

  it("keeps open_count aligned with work_order_rows length on the same snapshot", () => {
    const tasks = [
      task({ id: "t1", stage: "In Progress" }),
      task({ id: "t2", stage: "Planned" }),
      task({ id: "t3", stage: "Done", updated_at: "2026-07-07T09:00:00.000Z" }),
      task({ id: "t4", stage: "Logged" }),
    ];

    const kpi = buildKpiSummary(tasks, NOW);
    const rows = buildWorkOrderRows(tasks, NOW);

    expect(kpi.open_count).toBe(rows.length);
    expect(rows).toHaveLength(2);
  });
});
