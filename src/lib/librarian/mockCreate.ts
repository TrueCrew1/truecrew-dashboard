import { artifactNotePath } from "../../../lib/librarian/paths";
import { deterministicArtifactDraft } from "../../../lib/librarian/refine.deterministic";
import type { Artifact, Persona, Task } from "@/types";

export function listMockArtifactsForTask(notes: Artifact[], taskId: string): Artifact[] {
  return notes.filter(
    (note) => note.sourceTaskId === taskId && note.agent === "librarian",
  );
}

export function createMockArtifact(
  task: Task,
  notes: Artifact[],
  actor: Persona = "operator",
): { artifact: Artifact; notes: Artifact[]; tasks: Task[] } {
  const existing = listMockArtifactsForTask(notes, task.id);
  if (existing.length > 0) {
    const err = new Error("Artifact already exists for this task");
    (err as Error & { code: string }).code = "ARTIFACT_EXISTS";
    throw err;
  }

  const draft = deterministicArtifactDraft(task);
  const obsidianPath = artifactNotePath(draft);
  const now = new Date().toISOString();

  const artifact: Artifact = {
    id: `artifact-${task.id}`,
    title: draft.title,
    type: draft.noteType,
    obsidianPath,
    summary: draft.summary,
    sourceTaskId: task.id,
    syncedAt: now,
    tags: draft.tags,
    refinementSource: "deterministic",
    agent: "librarian",
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
  };

  const updatedTask: Task = {
    ...task,
    obsidianNoteId: obsidianPath,
    updatedAt: now,
  };

  return {
    artifact,
    notes: [artifact, ...notes],
    tasks: [updatedTask],
  };
}
