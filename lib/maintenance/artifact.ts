import type { Artifact, Note } from "../../src/types";

/** Map a persisted note row (mock or Supabase) to the canonical Artifact shape. */
export function noteToMaintenanceNote(note: Note, clientTaskId?: string): Artifact | null {
  if (note.agent !== "maintenance") return null;

  return {
    id: note.id,
    workItemId: note.workItemId ?? note.sourceTaskId ?? clientTaskId ?? "",
    artifactType: note.artifactType ?? "obsidian_note",
    title: note.title,
    targetPath: note.targetPath ?? note.obsidianPath,
    tags: note.tags ?? [],
    createdAt: note.createdAt,
    summary: note.summary,
    refinementSource: note.refinementSource,
    syncedAt: note.syncedAt,
    updatedAt: note.updatedAt,
    createdBy: note.createdBy,
  };
}
