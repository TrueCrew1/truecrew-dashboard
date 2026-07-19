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

export interface WorkflowProjectContextRow {
  id: string;
  title: string;
  type: string;
  stage: string;
  owner: string;
  summary: string;
  tasks: Array<{
    id: string;
    title: string;
    stage: string;
    workflowType: string;
    priority: string;
    blocker: string | null;
    description: string;
  }>;
}

export async function fetchWorkflowProjectContext(
  workflowId: string,
): Promise<WorkflowProjectContextRow | null> {
  const supabase = getSupabaseAdmin();
  const workflowColumn = UUID_RE.test(workflowId) ? "id" : "legacy_id";

  const { data: workflow, error: wfError } = await supabase
    .from("workflows")
    .select("id, title, type, stage, owner, summary")
    .eq(workflowColumn, workflowId)
    .maybeSingle();

  if (wfError) throw new Error(wfError.message);
  if (!workflow) return null;

  const { data: links, error: linkError } = await supabase
    .from("workflow_tasks")
    .select("task_id")
    .eq("workflow_id", workflow.id);

  if (linkError) throw new Error(linkError.message);

  const taskIds = (links ?? []).map((row) => row.task_id);
  let tasks: WorkflowProjectContextRow["tasks"] = [];

  if (taskIds.length > 0) {
    const { data: taskRows, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, stage, workflow_type, priority, blocker, description")
      .in("id", taskIds)
      .order("updated_at", { ascending: true });

    if (taskError) throw new Error(taskError.message);

    tasks = (taskRows ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      stage: task.stage,
      workflowType: task.workflow_type,
      priority: task.priority,
      blocker: task.blocker,
      description: task.description,
    }));
  }

  return {
    id: workflow.id,
    title: workflow.title,
    type: workflow.type,
    stage: workflow.stage,
    owner: workflow.owner,
    summary: workflow.summary,
    tasks,
  };
}

export interface IncidentContextRow {
  id: string;
  title: string;
  severity: number;
  status: string;
  serviceName: string;
  summary: string;
  openedAt: string;
  mitigatedAt?: string;
  resolvedAt?: string;
  linkedRepairId?: string;
}

export async function fetchIncidentContext(
  incidentId: string,
): Promise<IncidentContextRow | null> {
  const supabase = getSupabaseAdmin();
  const column = UUID_RE.test(incidentId) ? "id" : "legacy_id";

  const { data, error } = await supabase
    .from("incidents")
    .select(
      "id, title, severity, status, service_name, summary, opened_at, mitigated_at, resolved_at, linked_repair_id",
    )
    .eq(column, incidentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as {
    id: string;
    title: string;
    severity: number;
    status: string;
    service_name: string;
    summary: string;
    opened_at: string;
    mitigated_at: string | null;
    resolved_at: string | null;
    linked_repair_id: string | null;
  };

  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    serviceName: row.service_name,
    summary: row.summary,
    openedAt: row.opened_at,
    mitigatedAt: row.mitigated_at ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    linkedRepairId: row.linked_repair_id ?? undefined,
  };
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
