import { isVaultConfigured } from "../obsidian/config";
import { writeVaultNote } from "../obsidian/write";
import { mapDbTaskToClient } from "../mappers/tasks";
import { isSupabaseConfigured, writeAuditEvent } from "../supabase/admin";
import type { Task } from "../../src/types";
import {
  fetchNoteForTaskUuid,
  fetchNotesForTaskUuid,
  fetchTaskRowByClientId,
  mapDbNoteToArtifact,
  setTaskObsidianNoteId,
  upsertNoteByPath,
} from "../supabase/notes";
import { artifactNotePath } from "./paths";
import { refineArtifactDraft } from "./refine";
import { renderTaskArtifactNote } from "./templates";
import type { Artifact, CreateArtifactInput, CreateArtifactResult } from "./types";
import { workItemFromTask } from "./workItem";

export async function listTaskArtifacts(taskId: string): Promise<Artifact[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Database not configured");
  }

  const taskRow = await fetchTaskRowByClientId(taskId);
  if (!taskRow) {
    throw new Error("Task not found");
  }

  const clientTaskId = taskRow.legacy_id ?? taskRow.id;
  const notes = await fetchNotesForTaskUuid(taskRow.id);
  return notes.map((row) => mapDbNoteToArtifact(row, clientTaskId));
}

export async function createTaskArtifact(input: CreateArtifactInput): Promise<CreateArtifactResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Database not configured");
  }

  const taskRow = await fetchTaskRowByClientId(input.taskId);
  if (!taskRow) {
    throw new Error("Task not found");
  }

  const existing = await fetchNoteForTaskUuid(taskRow.id);
  if (existing) {
    const err = new Error("Artifact already exists for this task");
    (err as Error & { code: string }).code = "ARTIFACT_EXISTS";
    throw err;
  }

  const task = mapDbTaskToClient(taskRow) as Task;
  const clientTaskId = taskRow.legacy_id ?? taskRow.id;
  const refined = await refineArtifactDraft(task, { useAi: Boolean(input.useAi) });
  const targetPath = artifactNotePath(refined);
  const markdown = renderTaskArtifactNote(task, refined, targetPath, refined.refinementSource);

  let vaultWritten = false;
  if (isVaultConfigured()) {
    await writeVaultNote(targetPath, markdown);
    vaultWritten = true;
  }

  const legacyId = `artifact-${clientTaskId}`;
  const noteRow = await upsertNoteByPath({
    legacyId,
    title: refined.title,
    type: refined.noteType,
    obsidianPath: targetPath,
    summary: refined.summary,
    sourceTaskUuid: taskRow.id,
    tags: refined.tags,
    refinementSource: refined.refinementSource,
    createdBy: input.actor ?? "operator",
  });

  await setTaskObsidianNoteId(taskRow.id, targetPath);

  // Hard-fail: unlike the Maintenance slice's identical audit call, this is
  // intentionally not wrapped in try/catch. If the audit write fails after
  // the note/vault work already succeeded, the caller still sees an error —
  // consistent across both domains (governance-tested in create.test.ts).
  await writeAuditEvent(
    "task",
    taskRow.id,
    "artifact_created",
    {
      targetPath,
      refinementSource: refined.refinementSource,
      vaultWritten,
    },
    "librarian",
  );

  const artifact = mapDbNoteToArtifact(noteRow, clientTaskId);

  return {
    workItem: workItemFromTask(task, true),
    artifact,
    vaultWritten,
  };
}
