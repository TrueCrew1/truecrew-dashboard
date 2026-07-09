import { describe, expect, it } from "vitest";
import type { Artifact, Note } from "../../src/types";
import { artifactToNoteFields, noteToArtifact } from "./artifact";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    title: "Pump station work record",
    type: "incident",
    obsidianPath: "Operations/Artifacts/2026-07-01 — Pump station.md",
    summary: "Telemetry board swapped.",
    sourceTaskId: "uuid-task",
    syncedAt: "2026-07-01T00:00:00.000Z",
    tags: ["repair", "librarian"],
    refinementSource: "deterministic",
    agent: "librarian",
    workItemId: "task-7",
    artifactType: "obsidian_note",
    targetPath: "Operations/Artifacts/2026-07-01 — Pump station.md",
    createdBy: "operator",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("noteToArtifact", () => {
  it("returns null for a note not authored by the librarian agent", () => {
    expect(noteToArtifact(makeNote({ agent: undefined }))).toBeNull();
  });

  it("maps a librarian note to the canonical Artifact shape", () => {
    const artifact = noteToArtifact(makeNote());

    expect(artifact).toEqual({
      id: "note-1",
      workItemId: "task-7",
      artifactType: "obsidian_note",
      title: "Pump station work record",
      targetPath: "Operations/Artifacts/2026-07-01 — Pump station.md",
      tags: ["repair", "librarian"],
      createdAt: "2026-07-01T00:00:00.000Z",
      summary: "Telemetry board swapped.",
      refinementSource: "deterministic",
      syncedAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      createdBy: "operator",
    });
  });

  it("falls back through workItemId → sourceTaskId → clientTaskId, and defaults tags/targetPath", () => {
    const artifact = noteToArtifact(
      makeNote({
        workItemId: undefined,
        sourceTaskId: undefined,
        tags: undefined,
        targetPath: undefined,
        artifactType: undefined,
        obsidianPath: "Operations/Artifacts/x.md",
      }),
      "client-99",
    );

    expect(artifact?.workItemId).toBe("client-99");
    expect(artifact?.tags).toEqual([]);
    expect(artifact?.targetPath).toBe("Operations/Artifacts/x.md");
    expect(artifact?.artifactType).toBe("obsidian_note");
  });
});

describe("artifactToNoteFields", () => {
  const artifact: Artifact = {
    id: "art-1",
    workItemId: "task-7",
    artifactType: "obsidian_note",
    title: "Work record",
    targetPath: "Operations/Artifacts/rec.md",
    tags: ["build"],
    createdAt: "2026-07-02T00:00:00.000Z",
  };

  it("stamps agent 'librarian' and defaults refinementSource/syncedAt/updatedAt", () => {
    const note = artifactToNoteFields(artifact, "build", "founder");

    expect(note.agent).toBe("librarian");
    expect(note.type).toBe("build");
    expect(note.createdBy).toBe("founder");
    expect(note.refinementSource).toBe("deterministic");
    expect(note.syncedAt).toBe("2026-07-02T00:00:00.000Z");
    expect(note.updatedAt).toBe("2026-07-02T00:00:00.000Z");
    expect(note.summary).toBe("");
  });
});
