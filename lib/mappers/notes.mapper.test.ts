import { describe, expect, it } from "vitest";
import { mapCommandCenterData } from "./index";

type RawRows = Parameters<typeof mapCommandCenterData>[0];

function makeNoteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    legacy_id: "maintenance-task-42",
    title: "Maintenance — Replace HVAC filter",
    type: "ticket",
    obsidian_path: "Operations/Maintenance/2026-07-01 — Replace HVAC filter.md",
    summary: "Quarterly maintenance on rooftop unit 3.",
    source_task_id: "task-42",
    synced_at: "2026-07-01T00:00:00.000Z",
    tags: ["maintenance", "operations"],
    refinement_source: "deterministic",
    agent: "maintenance",
    created_by: "operator",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeRaw(notes: Record<string, unknown>[]): RawRows {
  return {
    tasks: [],
    workflows: [],
    workflowTasks: [],
    incidents: [],
    tools: [],
    deploys: [],
    customers: [],
    checklist: [],
    runbooks: [],
    prompts: [],
    notes,
  } as unknown as RawRows;
}

describe("mapCommandCenterData notes mapping", () => {
  it("preserves the maintenance agent through the mapper", () => {
    const { notes } = mapCommandCenterData(makeRaw([makeNoteRow()]));

    expect(notes).toHaveLength(1);
    expect(notes[0].agent).toBe("maintenance");
    expect(notes[0].workItemId).toBe("task-42");
  });

  it("still preserves the librarian agent", () => {
    const { notes } = mapCommandCenterData(
      makeRaw([makeNoteRow({ agent: "librarian" })]),
    );

    expect(notes[0].agent).toBe("librarian");
    expect(notes[0].artifactType).toBe("obsidian_note");
  });

  it("does not drop maintenance notes and leaves unknown agents undefined", () => {
    const { notes } = mapCommandCenterData(
      makeRaw([makeNoteRow(), makeNoteRow({ id: "x", legacy_id: "y", agent: "chief" })]),
    );

    expect(notes).toHaveLength(2);
    expect(notes[0].agent).toBe("maintenance");
    expect(notes[1].agent).toBeUndefined();
  });
});
