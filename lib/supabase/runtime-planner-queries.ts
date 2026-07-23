import type {
  DbRuntimePlannerWorkItemRow,
  PlannerRequestedBy,
  PlannerTaskPayload,
  PlannerTriggerType,
  RuntimePlannerWorkItemClient,
} from "../planner/types.js";
import { PLANNER_AGENT_ROLE, PLANNER_INPUT_KIND } from "../planner/types.js";
import { getSupabaseAdmin } from "./admin.js";

export function mapRuntimePlannerWorkItemToClient(
  row: DbRuntimePlannerWorkItemRow,
): RuntimePlannerWorkItemClient {
  return {
    id: row.id,
    agentRole: PLANNER_AGENT_ROLE,
    inputKind: PLANNER_INPUT_KIND,
    status: row.status,
    triggerType: row.trigger_type,
    inputPayload: row.input_payload,
    idempotencyKey: row.idempotency_key,
    requestedBy: row.requested_by,
    chiefProposalId: row.chief_proposal_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPlannerWorkItemByIdempotencyKey(
  idempotencyKey: string,
): Promise<DbRuntimePlannerWorkItemRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_work_items")
    .select("*")
    .eq("agent_role", PLANNER_AGENT_ROLE)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) throw error;
  return (data as DbRuntimePlannerWorkItemRow | null) ?? null;
}

export interface InsertPlannerWorkItemParams {
  triggerType: PlannerTriggerType;
  inputPayload: PlannerTaskPayload;
  idempotencyKey: string | null;
  requestedBy: PlannerRequestedBy;
  chiefProposalId: string | null;
}

export async function insertPlannerWorkItem(
  params: InsertPlannerWorkItemParams,
): Promise<DbRuntimePlannerWorkItemRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("runtime_work_items")
    .insert({
      agent_role: PLANNER_AGENT_ROLE,
      trigger_type: params.triggerType,
      input_kind: PLANNER_INPUT_KIND,
      input_payload: params.inputPayload,
      status: "queued",
      idempotency_key: params.idempotencyKey,
      requested_by: params.requestedBy,
      chief_proposal_id: params.chiefProposalId,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505" && params.idempotencyKey) {
      const existing = await getPlannerWorkItemByIdempotencyKey(params.idempotencyKey);
      if (existing) return existing;
    }
    throw error;
  }

  return data as DbRuntimePlannerWorkItemRow;
}
