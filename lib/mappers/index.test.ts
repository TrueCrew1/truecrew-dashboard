import { describe, expect, it } from "vitest";
import { mapCommandCenterData } from "./index.js";

type RawCommandCenterRows = Parameters<typeof mapCommandCenterData>[0];

function makeRaw(notes: Record<string, unknown>[]): RawCommandCenterRows {
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
  } as unknown as RawCommandCenterRows;
}

function makeNoteRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    legacy_id: "note-1",
    title: "A note",
    type: "ticket",
    obsidian_path: "Operations/Maintenance/note.md",
    summary: "Summary",
    source_task_id: "task-1",
    synced_at: "2026-07-09T00:00:00.000Z",
    tags: ["maintenance"],
    refinement_source: "deterministic",
    agent: null,
    created_by: "operator",
    created_at: "2026-07-09T00:00:00.000Z",
    updated_at: "2026-07-09T00:00:00.000Z",
    ...overrides,
  };
}

describe("mapCommandCenterData notes mapping (#97/#98 agent taxonomy)", () => {
  it("preserves agent: 'librarian' and sets artifactType", () => {
    const { notes } = mapCommandCenterData(makeRaw([makeNoteRow({ agent: "librarian" })]));

    expect(notes[0].agent).toBe("librarian");
    expect(notes[0].artifactType).toBe("obsidian_note");
  });

  it("preserves agent: 'maintenance' and sets artifactType (previously dropped to undefined — #97)", () => {
    const { notes } = mapCommandCenterData(makeRaw([makeNoteRow({ agent: "maintenance" })]));

    expect(notes[0].agent).toBe("maintenance");
    expect(notes[0].artifactType).toBe("obsidian_note");
  });

  it("drops an unrecognized/null agent to undefined and leaves artifactType unset", () => {
    const { notes } = mapCommandCenterData(makeRaw([makeNoteRow({ agent: null })]));

    expect(notes[0].agent).toBeUndefined();
    expect(notes[0].artifactType).toBeUndefined();
  });

  it("still exposes the raw DB type value regardless of agent (DB/vault split stays intentional, not hidden)", () => {
    const { notes } = mapCommandCenterData(
      makeRaw([makeNoteRow({ agent: "maintenance", type: "ticket" })]),
    );

    expect(notes[0].type).toBe("ticket");
  });
});
