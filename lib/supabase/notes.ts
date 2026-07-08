import type { Persona } from "../../src/types";
import type { Artifact } from "../librarian/types";
import type { DbTaskRow } from "./admin";
import { getSupabaseAdmin } from "./admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DbNoteRow {
  id: string;
  legacy_id: string | null;
  title: string;
  type: string;
  obsidian_path: string;
  summary: string;
  source_task_id: string | null;
  synced_at: string;
  tags: string[] | null;
  refinement_source: "deterministic" | "ai" | null;
  agent: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function taskIdColumn(taskId: string): "id" | "legacy_id" {
  return UUID_RE.test(taskId) ? "id" : "legacy_id";
}

export async function fetchTaskRowByClientId(taskId: string): Promise<DbTaskRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, gate_checks(*)")
    .eq(taskIdColumn(taskId), taskId)
    .maybeSingle();

  if (error) throw error;
  return (data as DbTaskRow | null) ?? null;
}

export async function fetchNotesForTaskUuid(taskUuid: string): Promise<DbNoteRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("source_task_id", taskUuid)
    .order("synced_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbNoteRow[];
}

export async function fetchNoteForTaskUuid(taskUuid: string): Promise<DbNoteRow | null> {
  const notes = await fetchNotesForTaskUuid(taskUuid);
  return notes[0] ?? null;
}

export interface UpsertNoteInput {
  legacyId: string;
  title: string;
  type: string;
  obsidianPath: string;
  summary: string;
  sourceTaskUuid: string;
  tags: string[];
  refinementSource: "deterministic" | "ai";
  agent?: string;
  createdBy: string;
}

export async function upsertNoteByPath(input: UpsertNoteInput): Promise<DbNoteRow> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const row = {
    legacy_id: input.legacyId,
    title: input.title,
    type: input.type,
    obsidian_path: input.obsidianPath,
    summary: input.summary,
    source_task_id: input.sourceTaskUuid,
    tags: input.tags,
    refinement_source: input.refinementSource,
    agent: input.agent ?? "librarian",
    synced_at: now,
    created_by: input.createdBy,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("notes")
    .upsert(row, { onConflict: "obsidian_path" })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbNoteRow;
}

export async function setTaskObsidianNoteId(
  taskUuid: string,
  obsidianPath: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("tasks")
    .update({ obsidian_note_id: obsidianPath })
    .eq("id", taskUuid);

  if (error) throw error;
}

export function mapDbNoteToArtifact(row: DbNoteRow, clientTaskId?: string): Artifact {
  const workItemId = clientTaskId ?? row.source_task_id ?? "";
  return {
    id: row.legacy_id ?? row.id,
    workItemId,
    artifactType: "obsidian_note",
    title: row.title,
    targetPath: row.obsidian_path,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    summary: row.summary ?? "",
    refinementSource: row.refinement_source ?? "deterministic",
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by as Persona,
  };
}
