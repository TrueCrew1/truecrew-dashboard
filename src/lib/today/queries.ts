import { WorkflowStage } from "@/types";
import { getSupabaseClient, isSupabaseClientConfigured } from "@/lib/supabase/client";
import type { CreateTaskInput, TodayTask } from "./types";

interface DbTodayTaskRow {
  id: string;
  legacy_id: string | null;
  title: string;
  description: string;
  stage: string;
  workflow_type: string;
  priority: string;
  assignee: string | null;
  due_at: string | null;
  blocker: string | null;
  site: string;
  crew: string;
  sla_tier: string;
  sla_due_at: string | null;
  is_mit: boolean;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DbTodayTaskRow): TodayTask {
  return {
    id: row.legacy_id ?? row.id,
    title: row.title,
    description: row.description,
    stage: row.stage as TodayTask["stage"],
    workflowType: row.workflow_type as TodayTask["workflowType"],
    priority: row.priority as TodayTask["priority"],
    assignee: (row.assignee as TodayTask["assignee"]) ?? undefined,
    dueAt: row.due_at ?? undefined,
    blocker: row.blocker ?? undefined,
    site: row.site as TodayTask["site"],
    crew: row.crew as TodayTask["crew"],
    slaTier: row.sla_tier as TodayTask["slaTier"],
    slaDueAt: row.sla_due_at ?? undefined,
    isMit: row.is_mit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TASK_SELECT = `
  id, legacy_id, title, description, stage, workflow_type, priority,
  assignee, due_at, blocker, site, crew, sla_tier, sla_due_at, is_mit,
  created_at, updated_at
`;

/**
 * Fetch active tasks from Supabase for the Today workspace.
 * Excludes Done and Logged stages.
 */
export async function fetchTodayTasks(): Promise<TodayTask[]> {
  if (!isSupabaseClientConfigured()) {
    throw new Error("Supabase client not configured");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .not("stage", "in", '("Done","Logged")')
    .order("sla_due_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as DbTodayTaskRow[]).map(mapRow);
}

/**
 * Create a new task via Supabase (Quick Capture).
 */
export async function createTodayTask(input: CreateTaskInput): Promise<TodayTask> {
  if (!isSupabaseClientConfigured()) {
    throw new Error("Supabase client not configured");
  }

  const supabase = getSupabaseClient();
  const priority = input.priority ?? "medium";
  const slaTier = input.slaTier ?? priorityToSla(priority);

  const slaDueAt = computeSlaDueAt(slaTier);

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      stage: WorkflowStage.Inbox,
      workflow_type: input.workflowType ?? "ticket",
      priority,
      site: input.site ?? "production",
      crew: input.crew ?? "platform",
      sla_tier: slaTier,
      sla_due_at: slaDueAt,
      created_by: "operator",
    })
    .select(TASK_SELECT)
    .single();

  if (error) throw error;
  return mapRow(data as DbTodayTaskRow);
}

/**
 * Set a task as the Most Important Now (MIT), clearing others.
 */
export async function setMitTask(taskId: string): Promise<void> {
  if (!isSupabaseClientConfigured()) {
    throw new Error("Supabase client not configured");
  }

  const supabase = getSupabaseClient();

  const { error: clearError } = await supabase
    .from("tasks")
    .update({ is_mit: false })
    .eq("is_mit", true);

  if (clearError) throw clearError;

  const { error } = await supabase
    .from("tasks")
    .update({ is_mit: true })
    .or(`legacy_id.eq.${taskId},id.eq.${taskId}`);

  if (error) throw error;
}

function priorityToSla(priority: string): TodayTask["slaTier"] {
  const map: Record<string, TodayTask["slaTier"]> = {
    critical: "p0",
    high: "p1",
    medium: "p2",
    low: "p3",
  };
  return map[priority] ?? "p2";
}

function computeSlaDueAt(tier: TodayTask["slaTier"]): string {
  const hours: Record<TodayTask["slaTier"], number> = {
    p0: 4,
    p1: 24,
    p2: 72,
    p3: 168,
  };
  return new Date(Date.now() + hours[tier] * 3600000).toISOString();
}
