import type { DbTaskRow } from "./admin.js";
import { getSupabaseAdmin } from "./admin.js";
import type { ResearchRequestStatus } from "../research/status.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CHIEF_APPROVAL_STATUSES = ["approved", "rejected", "sent_back"] as const;
export type DbChiefApprovalStatus = (typeof CHIEF_APPROVAL_STATUSES)[number];

export interface DbChiefApprovalDecisionRow {
  proposal_id: string;
  status: DbChiefApprovalStatus;
  decided_at: string;
  actor: string | null;
}

export function isChiefApprovalStatus(value: string): value is DbChiefApprovalStatus {
  return (CHIEF_APPROVAL_STATUSES as readonly string[]).includes(value);
}

export async function fetchChiefApprovalDecisions(): Promise<DbChiefApprovalDecisionRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chief_approval_decisions")
    .select("proposal_id, status, decided_at, actor")
    .order("decided_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbChiefApprovalDecisionRow[];
}

export async function getChiefApprovalDecision(
  proposalId: string,
): Promise<DbChiefApprovalDecisionRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chief_approval_decisions")
    .select("proposal_id, status, decided_at, actor")
    .eq("proposal_id", proposalId)
    .maybeSingle();

  if (error) throw error;
  return (data as DbChiefApprovalDecisionRow | null) ?? null;
}

export async function insertChiefApprovalDecision(
  proposalId: string,
  status: DbChiefApprovalStatus,
  actor: string | null,
): Promise<{ row: DbChiefApprovalDecisionRow; created: boolean }> {
  const existing = await getChiefApprovalDecision(proposalId);
  if (existing) {
    return { row: existing, created: false };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chief_approval_decisions")
    .insert({
      proposal_id: proposalId,
      status,
      actor,
    })
    .select("proposal_id, status, decided_at, actor")
    .single();

  if (error) {
    if (error.code === "23505") {
      const raced = await getChiefApprovalDecision(proposalId);
      if (raced) return { row: raced, created: false };
    }
    throw error;
  }

  return { row: data as DbChiefApprovalDecisionRow, created: true };
}

export async function updateTaskStage(
  taskId: string,
  stage: string,
): Promise<DbTaskRow> {
  const supabase = getSupabaseAdmin();
  const column = UUID_RE.test(taskId) ? "id" : "legacy_id";

  const { data, error } = await supabase
    .from("tasks")
    .update({ stage })
    .eq(column, taskId)
    .select("*, gate_checks(*)")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Task not found");
  return data as DbTaskRow;
}

export async function fetchRawCommandCenterRows() {
  const supabase = getSupabaseAdmin();

  const [
    tasksRes,
    workflowsRes,
    workflowTasksRes,
    incidentsRes,
    toolsRes,
    deploysRes,
    customersRes,
    checklistRes,
    runbooksRes,
    promptsRes,
    notesRes,
  ] = await Promise.all([
    supabase.from("tasks").select("*, gate_checks(*)").order("updated_at", { ascending: false }),
    supabase.from("workflows").select("*").order("updated_at", { ascending: false }),
    supabase.from("workflow_tasks").select("*"),
    supabase.from("incidents").select("*").order("opened_at", { ascending: false }),
    supabase.from("tools").select("*").order("name"),
    supabase.from("deploys").select("*").order("updated_at", { ascending: false }),
    supabase.from("customers").select("*").order("name"),
    supabase.from("customer_checklist_items").select("*"),
    supabase.from("runbooks").select("*").order("title"),
    supabase.from("prompts").select("*").order("title"),
    supabase.from("notes").select("*").order("synced_at", { ascending: false }),
  ]);

  const errors = [
    tasksRes.error,
    workflowsRes.error,
    workflowTasksRes.error,
    incidentsRes.error,
    toolsRes.error,
    deploysRes.error,
    customersRes.error,
    checklistRes.error,
    runbooksRes.error,
    promptsRes.error,
    notesRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  return {
    tasks: tasksRes.data ?? [],
    workflows: workflowsRes.data ?? [],
    workflowTasks: workflowTasksRes.data ?? [],
    incidents: incidentsRes.data ?? [],
    tools: toolsRes.data ?? [],
    deploys: deploysRes.data ?? [],
    customers: customersRes.data ?? [],
    checklist: checklistRes.data ?? [],
    runbooks: runbooksRes.data ?? [],
    prompts: promptsRes.data ?? [],
    notes: notesRes.data ?? [],
  };
}

// ---------------------------------------------------------------------------
// Research requests (public.research_requests — see the 20260722000001
// migration). Status vocabulary/transitions come from lib/research/status.ts.

const RESEARCH_REQUEST_COLUMNS =
  "id, topic, why_it_matters, suggested_outcome, source, status, filed_path, blocker_note, created_at, updated_at";

export interface DbResearchRequestRow {
  id: string;
  topic: string;
  why_it_matters: string;
  suggested_outcome: string;
  source: "adapter" | "session";
  status: ResearchRequestStatus;
  filed_path: string | null;
  blocker_note: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchResearchRequests(): Promise<DbResearchRequestRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("research_requests")
    .select(RESEARCH_REQUEST_COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbResearchRequestRow[];
}

export async function getResearchRequest(id: string): Promise<DbResearchRequestRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("research_requests")
    .select(RESEARCH_REQUEST_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as DbResearchRequestRow | null) ?? null;
}

export async function insertResearchRequest(row: {
  id: string;
  topic: string;
  why_it_matters: string;
  suggested_outcome: string;
  created_at: string;
  updated_at: string;
}): Promise<{ row: DbResearchRequestRow; created: boolean }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("research_requests")
    .insert({ ...row, source: "session", status: "queued" })
    .select(RESEARCH_REQUEST_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") {
      const raced = await getResearchRequest(row.id);
      if (raced) return { row: raced, created: false };
    }
    throw error;
  }

  return { row: data as DbResearchRequestRow, created: true };
}

export async function updateResearchRequestStatus(
  id: string,
  status: ResearchRequestStatus,
  options: { filedPath?: string; blockerNote?: string },
): Promise<DbResearchRequestRow | null> {
  const supabase = getSupabaseAdmin();
  const patch: Record<string, string> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "done" && options.filedPath) patch.filed_path = options.filedPath;
  if (status === "blocked" && options.blockerNote) patch.blocker_note = options.blockerNote;

  const { data, error } = await supabase
    .from("research_requests")
    .update(patch)
    .eq("id", id)
    .select(RESEARCH_REQUEST_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return (data as DbResearchRequestRow | null) ?? null;
}
