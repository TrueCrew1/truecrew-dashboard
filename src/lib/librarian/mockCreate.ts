import { artifactNotePath } from "../../../lib/librarian/paths";
import { deterministicArtifactDraft } from "../../../lib/librarian/refine.deterministic";
import { workItemFromTask } from "../../../lib/librarian/workItem";
import { artifactToNoteFields } from "../../../lib/librarian/artifact";
import type { Artifact, Note, Persona, Task, WorkItem } from "@/types";
import { noteToArtifact } from "../../../lib/librarian/artifact";

export function listMockArtifactsForTask(notes: Note[], taskId: string): Artifact[] {
  return notes
    .map((note) => noteToArtifact(note))
    .filter((artifact): artifact is Artifact => artifact !== null && artifact.workItemId === taskId);
}

export function createMockArtifact(
  task: Task,
  notes: Note[],
  actor: Persona = "operator",
): { workItem: WorkItem; artifact: Artifact; notes: Note[]; tasks: Task[] } {
  const existing = listMockArtifactsForTask(notes, task.id);
  if (existing.length > 0) {
    const err = new Error("Artifact already exists for this task");
    (err as Error & { code: string }).code = "ARTIFACT_EXISTS";
    throw err;
  }

  const draft = deterministicArtifactDraft(task);
  const targetPath = artifactNotePath(draft);
  const now = new Date().toISOString();

  const artifact: Artifact = {
    id: `artifact-${task.id}`,
    workItemId: task.id,
    artifactType: "obsidian_note",
    title: draft.title,
    targetPath,
    tags: draft.tags,
    createdAt: now,
    summary: draft.summary,
    refinementSource: "deterministic",
    syncedAt: now,
    updatedAt: now,
    createdBy: actor,
  };

  const noteRecord = artifactToNoteFields(artifact, draft.noteType, actor);

  const updatedTask: Task = {
    ...task,
    obsidianNoteId: targetPath,
    updatedAt: now,
  };

  return {
    workItem: workItemFromTask(updatedTask, true),
    artifact,
    notes: [noteRecord, ...notes.filter((n) => n.id !== noteRecord.id)],
    tasks: [updatedTask],
  };
}
