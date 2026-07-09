import { isVaultConfigured } from "../obsidian/config";
import { writeVaultNote } from "../obsidian/write";
import { sanitizeFilenameSegment } from "../obsidian/paths";
import { mapDbTaskToClient } from "../mappers/tasks";
import { isSupabaseConfigured, writeAuditEvent } from "../supabase/admin";
import type { Task, WorkItem } from "../../src/types";
import {
  fetchTaskRowByClientId,
  mapDbNoteToArtifact,
  setTaskObsidianNoteId,
  upsertNoteByPath,
} from "../supabase/notes";
import { renderMaintenanceNote } from "./templates";
import type {
  CreateMaintenanceNoteInput,
  CreateMaintenanceNoteResult,
} from "./types";

function maintenanceNotePath(task: Task, loggedAt = new Date()): string {
  const date = loggedAt.toISOString().slice(0, 10);
  const safeTitle = sanitizeFilenameSegment(task.title);
  return `Operations/Maintenance/${date} — ${safeTitle}.md`;
}

function maintenanceWorkItem(task: Task): WorkItem {
  return {
    id: task.id,
    type: "obsidian_filing",
    source: task.workflowType,
    status: "filed",
  };
}

/**
 * Single entry point for the Maintenance slice. There is no queue runtime in
 * this repo, so this mirrors the Librarian `createTaskArtifact` pattern:
 * a synchronous fetch → render → write → index flow with the same fail-open
 * (vault) vs hard-fail (config/db) contract.
 */
export async function createMaintenanceNote(
  input: CreateMaintenanceNoteInput,
): Promise<CreateMaintenanceNoteResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Database not configured");
  }

  const taskRow = await fetchTaskRowByClientId(input.taskId);
  if (!taskRow) {
    throw new Error("Task not found");
  }

  const task = mapDbTaskToClient(taskRow) as Task;
  const clientTaskId = taskRow.legacy_id ?? taskRow.id;
  const targetPath = maintenanceNotePath(task);
  const markdown = renderMaintenanceNote(task, targetPath);

  let vaultWritten = false;
  if (isVaultConfigured()) {
    await writeVaultNote(targetPath, markdown);
    vaultWritten = true;
  }

  const noteRow = await upsertNoteByPath({
    legacyId: `maintenance-${clientTaskId}`,
    title: `Maintenance — ${task.title}`,
    type: "ticket",
    obsidianPath: targetPath,
    summary: task.description?.trim() || `Maintenance note for ${task.title}`,
    sourceTaskUuid: taskRow.id,
    tags: ["maintenance", "operations"],
    refinementSource: "deterministic",
    agent: "maintenance",
    createdBy: input.actor ?? "operator",
  });

  await setTaskObsidianNoteId(taskRow.id, targetPath);

  await writeAuditEvent(
    "task",
    taskRow.id,
    "maintenance_note_created",
    {
      targetPath,
      vaultWritten,
    },
    "operator",
  );

  const note = mapDbNoteToArtifact(noteRow, clientTaskId);

  return {
    workItem: maintenanceWorkItem(task),
    note,
    vaultWritten,
  };
}
