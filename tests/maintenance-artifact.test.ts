import { describe, expect, it } from "vitest";
import type { Note } from "../src/types";
import { noteToMaintenanceNote } from "../lib/maintenance/artifact";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    title: "Maintenance — Replace HVAC filter",
    type: "ticket",
    obsidianPath: "Operations/Maintenance/2026-07-09 — Replace HVAC filter.md",
    summary: "Quarterly maintenance on rooftop unit 3.",
    sourceTaskId: "uuid-task",
    syncedAt: "2026-07-09T00:00:00.000Z",
    tags: ["maintenance", "operations"],
    refinementSource: "deterministic",
    agent: "maintenance",
    workItemId: "task-42",
    artifactType: "obsidian_note",
    targetPath: "Operations/Maintenance/2026-07-09 — Replace HVAC filter.md",
    createdBy: "operator",
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
    ...overrides,
  };
}

describe("noteToMaintenanceNote", () => {
  it("returns null for a note not authored by the maintenance agent", () => {
    expect(noteToMaintenanceNote(makeNote({ agent: undefined }))).toBeNull();
    expect(noteToMaintenanceNote(makeNote({ agent: "librarian" }))).toBeNull();
  });

  it("maps a maintenance note to the canonical Artifact shape", () => {
    const note = noteToMaintenanceNote(makeNote());

    expect(note).toEqual({
      id: "note-1",
      workItemId: "task-42",
      artifactType: "obsidian_note",
      title: "Maintenance — Replace HVAC filter",
      targetPath: "Operations/Maintenance/2026-07-09 — Replace HVAC filter.md",
      tags: ["maintenance", "operations"],
      createdAt: "2026-07-09T00:00:00.000Z",
      summary: "Quarterly maintenance on rooftop unit 3.",
      refinementSource: "deterministic",
      syncedAt: "2026-07-09T00:00:00.000Z",
      updatedAt: "2026-07-09T00:00:00.000Z",
      createdBy: "operator",
    });
  });

  it("falls back through workItemId → sourceTaskId → clientTaskId, and defaults tags/targetPath", () => {
    const note = noteToMaintenanceNote(
      makeNote({
        workItemId: undefined,
        sourceTaskId: undefined,
        tags: undefined,
        targetPath: undefined,
        artifactType: undefined,
        obsidianPath: "Operations/Maintenance/x.md",
      }),
      "client-99",
    );

    expect(note?.workItemId).toBe("client-99");
    expect(note?.tags).toEqual([]);
    expect(note?.targetPath).toBe("Operations/Maintenance/x.md");
    expect(note?.artifactType).toBe("obsidian_note");
  });
});
