import { describe, expect, it } from "vitest";
import type { Note } from "../../src/types";
import { noteToArtifact } from "../librarian/artifact";
import { isMaintenanceNote, selectTaskMaintenanceNote } from "./select";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    title: "Maintenance — Replace HVAC filter",
    type: "ticket",
    obsidianPath: "Operations/Maintenance/2026-07-01 — Replace HVAC filter.md",
    summary: "Quarterly maintenance on rooftop unit 3.",
    sourceTaskId: "task-42",
    workItemId: "task-42",
    syncedAt: "2026-07-01T00:00:00.000Z",
    tags: ["maintenance", "operations"],
    refinementSource: "deterministic",
    agent: "maintenance",
    createdBy: "operator",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isMaintenanceNote", () => {
  it("is true only for maintenance-authored notes", () => {
    expect(isMaintenanceNote(makeNote())).toBe(true);
    expect(isMaintenanceNote(makeNote({ agent: "librarian" }))).toBe(false);
    expect(isMaintenanceNote(makeNote({ agent: undefined }))).toBe(false);
  });
});

describe("selectTaskMaintenanceNote", () => {
  it("returns the maintenance note linked to the task", () => {
    const note = makeNote();
    expect(selectTaskMaintenanceNote([note], "task-42")).toBe(note);
  });

  it("matches via sourceTaskId when workItemId is absent", () => {
    const note = makeNote({ workItemId: undefined, sourceTaskId: "task-42" });
    expect(selectTaskMaintenanceNote([note], "task-42")).toBe(note);
  });

  it("returns null when the task has no maintenance note (can create)", () => {
    expect(selectTaskMaintenanceNote([], "task-42")).toBeNull();
    expect(
      selectTaskMaintenanceNote([makeNote({ agent: "librarian" })], "task-42"),
    ).toBeNull();
    expect(selectTaskMaintenanceNote([makeNote()], "task-99")).toBeNull();
  });

  it("does not misclassify maintenance notes as Librarian artifacts", () => {
    expect(noteToArtifact(makeNote())).toBeNull();
  });
});
