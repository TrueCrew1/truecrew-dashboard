import type { DbTaskRow } from "./admin.js";
import { getSupabaseAdmin } from "./admin.js";

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

export interface InsertPlannerApprovedTaskParams {
  title: string;
  description: string;
  createdBy: "founder" | "operator" | "observer";
}

/**
 * Creates a tasks row from a Planner work item whose chief_proposal_id maps
 * to an approved chief_approval_decisions row — the one bounded Planner
 * action allowed to mutate the tasks table. Callers must verify approval
 * via getChiefApprovalDecision before calling this.
 */
export async function insertPlannerApprovedTask(
  params: InsertPlannerApprovedTaskParams,
): Promise<DbTaskRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: params.title,
      description: params.description,
      stage: "Planned",
      workflow_type: "build",
      priority: "medium",
      created_by: params.createdBy,
    })
    .select("*, gate_checks(*)")
    .single();

  if (error) throw error;
  return data as DbTaskRow;
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
