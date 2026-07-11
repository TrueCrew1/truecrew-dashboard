import { createHash } from "node:crypto";
import type {
  ChiefDecisionPayload,
  DbRuntimeArtifactRow,
  DbRuntimeExecutionJobRow,
  DbRuntimeMaintenanceWorkItemRow,
  DbRuntimePlannerWorkItemRow,
  DbRuntimeSinkDeliveryRow,
  DbRuntimeWorkItemRow,
  LibrarianInputKind,
  MaintenanceTaskPayload,
  PlannerTaskPayload,
  RuntimeExecutionJobStatus,
  RuntimeMaintenanceWorkItemClient,
  RuntimePassRecord,
  RuntimePlannerWorkItemClient,
  RuntimeRequestedBy,
  RuntimeTriggerType,
  RuntimeWorkItemClient,
  RuntimeWorkItemStatus,
} from "../runtime/types.js";
import { getSupabaseAdmin } from "./admin.js";

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function mapRuntimeWorkItemToClient(
  row: DbRuntimeWorkItemRow,
  latestObsidianPath: string | null = null,
): RuntimeWorkItemClient {
  return {
    id: row.id,
    agentRole: row.agent_role,
    triggerType: row.trigger_type,
    inputKind: row.input_kind,
    inputPayload: row.input_payload,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    requestedBy: row.requested_by,
    chiefProposalId: row.chief_proposal_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestObsidianPath,
  };
}

export async function getRuntimeWorkItemById(id: string): Promise<DbRuntimeWorkItemRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_work_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as DbRuntimeWorkItemRow | null) ?? null;
}

export async function getRuntimeWorkItemByIdempotencyKey(
  idempotencyKey: string,
): Promise<DbRuntimeWorkItemRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_work_items")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) throw error;
  return (data as DbRuntimeWorkItemRow | null) ?? null;
}

export interface InsertRuntimeWorkItemParams {
  triggerType: RuntimeTriggerType;
  inputKind: LibrarianInputKind;
  inputPayload: ChiefDecisionPayload;
  idempotencyKey?: string | null;
  requestedBy: RuntimeRequestedBy;
  chiefProposalId?: string | null;
}

export async function insertRuntimeWorkItem(
  params: InsertRuntimeWorkItemParams,
): Promise<DbRuntimeWorkItemRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_work_items")
    .insert({
      agent_role: "librarian",
      trigger_type: params.triggerType,
      input_kind: params.inputKind,
      input_payload: params.inputPayload,
      status: "queued",
      idempotency_key: params.idempotencyKey ?? null,
      requested_by: params.requestedBy,
      chief_proposal_id: params.chiefProposalId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505" && params.idempotencyKey) {
      const existing = await getRuntimeWorkItemByIdempotencyKey(params.idempotencyKey);
      if (existing) return existing;
    }
    throw error;
  }

  return data as DbRuntimeWorkItemRow;
}

export interface InsertRuntimeMaintenanceWorkItemParams {
  triggerType: RuntimeTriggerType;
  inputPayload: MaintenanceTaskPayload;
  idempotencyKey?: string | null;
  requestedBy: RuntimeRequestedBy;
  chiefProposalId?: string | null;
}

export async function insertRuntimeMaintenanceWorkItem(
  params: InsertRuntimeMaintenanceWorkItemParams,
): Promise<DbRuntimeMaintenanceWorkItemRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_work_items")
    .insert({
      agent_role: "maintenance",
      trigger_type: params.triggerType,
      input_kind: "maintenance_task",
      input_payload: params.inputPayload,
      status: "queued",
      idempotency_key: params.idempotencyKey ?? null,
      requested_by: params.requestedBy,
      chief_proposal_id: params.chiefProposalId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505" && params.idempotencyKey) {
      const existing = await getRuntimeWorkItemByIdempotencyKey(params.idempotencyKey);
      if (existing) return existing as unknown as DbRuntimeMaintenanceWorkItemRow;
    }
    throw error;
  }

  return data as DbRuntimeMaintenanceWorkItemRow;
}

export interface InsertRuntimePlannerWorkItemParams {
  triggerType: RuntimeTriggerType;
  inputPayload: PlannerTaskPayload;
  idempotencyKey?: string | null;
  requestedBy: RuntimeRequestedBy;
  chiefProposalId?: string | null;
}

export async function insertRuntimePlannerWorkItem(
  params: InsertRuntimePlannerWorkItemParams,
): Promise<DbRuntimePlannerWorkItemRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_work_items")
    .insert({
      agent_role: "planner",
      trigger_type: params.triggerType,
      input_kind: "planning_task",
      input_payload: params.inputPayload,
      status: "queued",
      idempotency_key: params.idempotencyKey ?? null,
      requested_by: params.requestedBy,
      chief_proposal_id: params.chiefProposalId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505" && params.idempotencyKey) {
      const existing = await getRuntimeWorkItemByIdempotencyKey(params.idempotencyKey);
      if (existing) return existing as unknown as DbRuntimePlannerWorkItemRow;
    }
    throw error;
  }

  return data as DbRuntimePlannerWorkItemRow;
}

export async function fetchLibrarianWorkItems(limit = 20): Promise<RuntimeWorkItemClient[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_work_items")
    .select("*")
    .eq("agent_role", "librarian")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = (data ?? []) as DbRuntimeWorkItemRow[];

  const completedIds = rows.filter((row) => row.status === "completed").map((row) => row.id);
  const obsidianByWorkItem = await fetchLatestObsidianPathsForWorkItems(completedIds);

  return rows.map((row) =>
    mapRuntimeWorkItemToClient(row, obsidianByWorkItem.get(row.id) ?? null),
  );
}

export function mapRuntimeMaintenanceWorkItemToClient(
  row: DbRuntimeMaintenanceWorkItemRow,
  latestObsidianPath: string | null = null,
): RuntimeMaintenanceWorkItemClient {
  return {
    id: row.id,
    agentRole: row.agent_role,
    triggerType: row.trigger_type,
    inputKind: row.input_kind,
    inputPayload: row.input_payload,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    requestedBy: row.requested_by,
    chiefProposalId: row.chief_proposal_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestObsidianPath,
  };
}

export async function fetchMaintenanceWorkItems(
  limit = 20,
): Promise<RuntimeMaintenanceWorkItemClient[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_work_items")
    .select("*")
    .eq("agent_role", "maintenance")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = (data ?? []) as DbRuntimeMaintenanceWorkItemRow[];

  const completedIds = rows.filter((row) => row.status === "completed").map((row) => row.id);
  const obsidianByWorkItem = await fetchLatestObsidianPathsForWorkItems(completedIds);

  return rows.map((row) =>
    mapRuntimeMaintenanceWorkItemToClient(row, obsidianByWorkItem.get(row.id) ?? null),
  );
}

export function mapRuntimePlannerWorkItemToClient(
  row: DbRuntimePlannerWorkItemRow,
  latestObsidianPath: string | null = null,
): RuntimePlannerWorkItemClient {
  return {
    id: row.id,
    agentRole: row.agent_role,
    triggerType: row.trigger_type,
    inputKind: row.input_kind,
    inputPayload: row.input_payload,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    requestedBy: row.requested_by,
    chiefProposalId: row.chief_proposal_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestObsidianPath,
  };
}

export async function fetchPlannerWorkItems(limit = 20): Promise<RuntimePlannerWorkItemClient[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_work_items")
    .select("*")
    .eq("agent_role", "planner")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = (data ?? []) as DbRuntimePlannerWorkItemRow[];

  const completedIds = rows.filter((row) => row.status === "completed").map((row) => row.id);
  const obsidianByWorkItem = await fetchLatestObsidianPathsForWorkItems(completedIds);

  return rows.map((row) =>
    mapRuntimePlannerWorkItemToClient(row, obsidianByWorkItem.get(row.id) ?? null),
  );
}

async function fetchLatestObsidianPathsForWorkItems(
  workItemIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (workItemIds.length === 0) return result;

  const supabase = getSupabaseAdmin();
  const { data: jobs, error: jobsError } = await supabase
    .from("runtime_execution_jobs")
    .select("id, work_item_id")
    .in("work_item_id", workItemIds);

  if (jobsError) throw jobsError;
  const jobRows = (jobs ?? []) as Array<{ id: string; work_item_id: string }>;
  if (jobRows.length === 0) return result;

  const jobIdToWorkItem = new Map(jobRows.map((job) => [job.id, job.work_item_id]));
  const { data: artifacts, error: artifactsError } = await supabase
    .from("runtime_artifacts")
    .select("execution_job_id, uri, artifact_kind")
    .in(
      "execution_job_id",
      jobRows.map((job) => job.id),
    )
    .eq("artifact_kind", "obsidian_note");

  if (artifactsError) throw artifactsError;

  for (const artifact of (artifacts ?? []) as Array<{
    execution_job_id: string;
    uri: string;
  }>) {
    const workItemId = jobIdToWorkItem.get(artifact.execution_job_id);
    if (workItemId && !result.has(workItemId)) {
      result.set(workItemId, artifact.uri);
    }
  }

  return result;
}

async function claimNextQueuedWorkItemByRole<T>(agentRole: string): Promise<T | null> {
  const supabase = getSupabaseAdmin();
  const { data: candidates, error: selectError } = await supabase
    .from("runtime_work_items")
    .select("*")
    .eq("agent_role", agentRole)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (selectError) throw selectError;
  const candidate = (candidates?.[0] as { id: string } | undefined) ?? null;
  if (!candidate) return null;

  const { data, error } = await supabase
    .from("runtime_work_items")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return (data as T | null) ?? null;
}

export async function claimNextQueuedLibrarianWorkItem(): Promise<DbRuntimeWorkItemRow | null> {
  return claimNextQueuedWorkItemByRole<DbRuntimeWorkItemRow>("librarian");
}

export async function claimNextQueuedMaintenanceWorkItem(): Promise<DbRuntimeMaintenanceWorkItemRow | null> {
  return claimNextQueuedWorkItemByRole<DbRuntimeMaintenanceWorkItemRow>("maintenance");
}

export async function claimNextQueuedPlannerWorkItem(): Promise<DbRuntimePlannerWorkItemRow | null> {
  return claimNextQueuedWorkItemByRole<DbRuntimePlannerWorkItemRow>("planner");
}

export async function updateRuntimeWorkItemStatus(
  id: string,
  status: RuntimeWorkItemStatus,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("runtime_work_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function insertRuntimeExecutionJob(
  workItemId: string,
  runner: string,
): Promise<DbRuntimeExecutionJobRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_execution_jobs")
    .insert({
      work_item_id: workItemId,
      status: "running",
      runner,
      passes: [],
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbRuntimeExecutionJobRow;
}

export async function finishRuntimeExecutionJob(
  jobId: string,
  status: Extract<RuntimeExecutionJobStatus, "succeeded" | "failed">,
  passes: RuntimePassRecord[],
  errorMessage?: string | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("runtime_execution_jobs")
    .update({
      status,
      passes,
      error_message: errorMessage ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) throw error;
}

export async function insertRuntimeArtifact(params: {
  executionJobId: string;
  artifactKind: "obsidian_note" | "index_row";
  uri: string;
  contentHash: string;
  metadata?: Record<string, unknown>;
}): Promise<DbRuntimeArtifactRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_artifacts")
    .insert({
      execution_job_id: params.executionJobId,
      artifact_kind: params.artifactKind,
      uri: params.uri,
      content_hash: params.contentHash,
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbRuntimeArtifactRow;
}

export async function insertRuntimeSinkDelivery(params: {
  artifactId: string;
  sink: "obsidian" | "supabase_notes";
  status: "delivered" | "failed" | "skipped";
  details?: Record<string, unknown>;
}): Promise<DbRuntimeSinkDeliveryRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_sink_deliveries")
    .insert({
      artifact_id: params.artifactId,
      sink: params.sink,
      status: params.status,
      details: params.details ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbRuntimeSinkDeliveryRow;
}

function normalizeNotesCreatedBy(
  requestedBy: RuntimeRequestedBy,
): "founder" | "operator" | "observer" {
  if (requestedBy === "founder" || requestedBy === "observer") return requestedBy;
  return "operator";
}

export async function upsertNotesIndexRow(params: {
  title: string;
  obsidianPath: string;
  summary: string;
  requestedBy: RuntimeRequestedBy;
}): Promise<{ id: string; created: boolean }> {
  const supabase = getSupabaseAdmin();
  const createdBy = normalizeNotesCreatedBy(params.requestedBy);
  const now = new Date().toISOString();

  const { data: existing, error: selectError } = await supabase
    .from("notes")
    .select("id")
    .eq("obsidian_path", params.obsidianPath)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing?.id) {
    const { data, error } = await supabase
      .from("notes")
      .update({
        title: params.title,
        summary: params.summary,
        synced_at: now,
        updated_at: now,
      })
      .eq("id", existing.id as string)
      .select("id")
      .single();

    if (error) throw error;
    return { id: data.id as string, created: false };
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      title: params.title,
      type: "decision",
      obsidian_path: params.obsidianPath,
      summary: params.summary,
      synced_at: now,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id as string, created: true };
}
