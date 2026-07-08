import type { Artifact, Note, Persona } from "../../src/types";

/** Map a persisted note row (mock or Supabase) to the canonical Artifact shape. */
export function noteToArtifact(note: Note, clientTaskId?: string): Artifact | null {
  if (note.agent !== "librarian") return null;

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

export function artifactToNoteFields(
  artifact: Artifact,
  noteType: Note["type"],
  actor: Persona,
): Note {
  const now = artifact.createdAt;
  return {
    id: artifact.id,
    title: artifact.title,
    type: noteType,
    obsidianPath: artifact.targetPath,
    targetPath: artifact.targetPath,
    summary: artifact.summary ?? "",
    sourceTaskId: artifact.workItemId,
    workItemId: artifact.workItemId,
    artifactType: artifact.artifactType,
    syncedAt: artifact.syncedAt ?? now,
    tags: artifact.tags,
    refinementSource: artifact.refinementSource ?? "deterministic",
    agent: "librarian",
    createdAt: now,
    updatedAt: artifact.updatedAt ?? now,
    createdBy: actor,
  };
}
