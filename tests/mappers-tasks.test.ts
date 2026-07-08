import { describe, expect, it } from "vitest";
import { mapDbTaskToClient } from "../lib/mappers/tasks.js";
import type { DbTaskRow } from "../lib/supabase/admin.js";

function makeRow(overrides: Partial<DbTaskRow> = {}): DbTaskRow {
  return {
    id: "uuid-1",
    legacy_id: null,
    title: "Inspect generator",
    description: "Quarterly check",
    stage: "In Progress",
    workflow_type: "repair",
    priority: "high",
    assignee: null,
    due_at: null,
    blocker: null,
    github_ref: null,
    github_repo: null,
    github_issue_number: null,
    github_pr_number: null,
    github_head_sha: null,
    obsidian_note_id: null,
    created_by: "operator",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    gate_checks: null,
    ...overrides,
  };
}

describe("mapDbTaskToClient", () => {
  it("prefers legacy_id as the client id when present", () => {
    expect(mapDbTaskToClient(makeRow({ legacy_id: "T-100" })).id).toBe("T-100");
  });

  it("falls back to the uuid id when legacy_id is null", () => {
    expect(mapDbTaskToClient(makeRow({ legacy_id: null })).id).toBe("uuid-1");
  });

  it("normalizes null optional columns to undefined", () => {
    const client = mapDbTaskToClient(makeRow());
    expect(client.assignee).toBeUndefined();
    expect(client.dueAt).toBeUndefined();
    expect(client.blocker).toBeUndefined();
    expect(client.githubRef).toBeUndefined();
    expect(client.obsidianNoteId).toBeUndefined();
  });

  it("maps gate rows using the gate_key as id", () => {
    const client = mapDbTaskToClient(
      makeRow({
        gate_checks: [
          {
            id: "row-1",
            gate_key: "ci_green",
            label: "CI green",
            required: true,
            passed: false,
            passed_at: null,
            source: null,
          },
        ],
      }),
    );
    expect(client.gates).toEqual([
      { id: "ci_green", label: "CI green", required: true, passed: false },
    ]);
  });

  it("defaults gates to an empty array when gate_checks is null", () => {
    expect(mapDbTaskToClient(makeRow({ gate_checks: null })).gates).toEqual([]);
  });

  it("passes through core scalar fields", () => {
    const client = mapDbTaskToClient(makeRow({ assignee: "founder", due_at: "2026-03-01" }));
    expect(client).toMatchObject({
      title: "Inspect generator",
      stage: "In Progress",
      workflowType: "repair",
      priority: "high",
      assignee: "founder",
      dueAt: "2026-03-01",
      createdBy: "operator",
    });
  });
});
