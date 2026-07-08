import { isVaultConfigured } from "../obsidian/config";
import { writeVaultNote } from "../obsidian/write";
import { mapDbTaskToClient } from "../mappers/tasks";
import type { DbTaskRow } from "../supabase/admin";
import { isSupabaseConfigured, writeAuditEvent } from "../supabase/admin";
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
import type { Artifact, CreateArtifactInput, CreateArtifactResult, WorkItem } from "./types";

function workItemFromRow(row: DbTaskRow): WorkItem {
  return mapDbTaskToClient(row) as WorkItem;
}

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

  const task = workItemFromRow(taskRow);
  const clientTaskId = taskRow.legacy_id ?? taskRow.id;
  const refined = await refineArtifactDraft(task, { useAi: Boolean(input.useAi) });
  const obsidianPath = artifactNotePath(refined);
  const markdown = renderTaskArtifactNote(task, refined, obsidianPath, refined.refinementSource);

  let vaultWritten = false;
  if (isVaultConfigured()) {
    await writeVaultNote(obsidianPath, markdown);
    vaultWritten = true;
  }

  const legacyId = `artifact-${clientTaskId}`;
  const noteRow = await upsertNoteByPath({
    legacyId,
    title: refined.title,
    type: refined.noteType,
    obsidianPath,
    summary: refined.summary,
    sourceTaskUuid: taskRow.id,
    tags: refined.tags,
    refinementSource: refined.refinementSource,
    createdBy: input.actor ?? "operator",
  });

  await setTaskObsidianNoteId(taskRow.id, obsidianPath);

  await writeAuditEvent(
    "task",
    taskRow.id,
    "artifact_created",
    {
      obsidianPath,
      refinementSource: refined.refinementSource,
      vaultWritten,
    },
    "librarian",
  );

  return {
    artifact: mapDbNoteToArtifact(noteRow, clientTaskId),
    vaultWritten,
  };
}
