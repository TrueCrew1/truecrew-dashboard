import type { DbTaskRow } from "../supabase/admin.js";

export interface ClientTask {
  id: string;
  title: string;
  description: string;
  stage: string;
  workflowType: string;
  priority: string;
  assignee?: string;
  dueAt?: string;
  blocker?: string;
  gates: { id: string; label: string; required: boolean; passed: boolean }[];
  linkedEntities: [];
  githubRef?: string;
  obsidianNoteId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function mapDbTaskToClient(row: DbTaskRow): ClientTask {
  const gates = (row.gate_checks ?? []).map((gate) => ({
    id: gate.gate_key,
    label: gate.label,
    required: gate.required,
    passed: gate.passed,
  }));

  return {
    id: row.legacy_id ?? row.id,
    title: row.title,
    description: row.description,
    stage: row.stage,
    workflowType: row.workflow_type,
    priority: row.priority,
    assignee: row.assignee ?? undefined,
    dueAt: row.due_at ?? undefined,
    blocker: row.blocker ?? undefined,
    gates,
    linkedEntities: [],
    githubRef: row.github_ref ?? undefined,
    obsidianNoteId: row.obsidian_note_id ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
