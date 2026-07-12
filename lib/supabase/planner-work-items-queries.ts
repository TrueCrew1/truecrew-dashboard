import type {
  DbPlannerWorkItemRow,
  PlannerWorkItem,
  PlannerWorkItemInput,
  PlannerWorkItemStatus,
} from "../planner-work-items/types.js";
import { getSupabaseAdmin } from "./admin.js";

export function mapPlannerWorkItemToClient(row: DbPlannerWorkItemRow): PlannerWorkItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignee: row.assignee,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertPlannerWorkItem(
  input: PlannerWorkItemInput,
): Promise<DbPlannerWorkItemRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("planner_work_items")
    .insert({
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "new",
      priority: input.priority ?? "medium",
      assignee: input.assignee ?? null,
      due_date: input.dueDate ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbPlannerWorkItemRow;
}

export async function fetchPlannerWorkItems(limit = 20): Promise<DbPlannerWorkItemRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("planner_work_items")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DbPlannerWorkItemRow[];
}

export async function fetchPlannerWorkItemsByStatus(
  statuses: PlannerWorkItemStatus[],
  limit = 20,
): Promise<DbPlannerWorkItemRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("planner_work_items")
    .select("*")
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DbPlannerWorkItemRow[];
}
