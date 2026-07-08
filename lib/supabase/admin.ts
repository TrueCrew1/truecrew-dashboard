import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export interface DbTaskRow {
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
  github_ref: string | null;
  github_repo: string | null;
  github_issue_number: number | null;
  github_pr_number: number | null;
  github_head_sha: string | null;
  obsidian_note_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  gate_checks: DbGateRow[] | null;
}

export interface DbGateRow {
  id: string;
  gate_key: string;
  label: string;
  required: boolean;
  passed: boolean;
  passed_at: string | null;
  source: string | null;
}

export async function fetchTasksWithGates(): Promise<DbTaskRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, gate_checks(*)")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbTaskRow[];
}

export async function recordWebhookDelivery(
  deliveryId: string,
  eventType: string,
  action: string | null,
  repo: string | null,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("github_webhook_deliveries").insert({
    delivery_id: deliveryId,
    event_type: eventType,
    action,
    repo,
  });

  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}

export async function passGateForTasks(
  taskIds: string[],
  gateKey: string,
  source: "github_webhook" | "system" = "github_webhook",
): Promise<number> {
  if (taskIds.length === 0) return 0;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("gate_checks")
    .update({
      passed: true,
      passed_at: new Date().toISOString(),
      source,
    })
    .in("task_id", taskIds)
    .eq("gate_key", gateKey)
    .eq("passed", false)
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

export async function failGateForTasks(
  taskIds: string[],
  gateKey: string,
  source: "github_webhook" | "system" = "github_webhook",
): Promise<number> {
  if (taskIds.length === 0) return 0;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("gate_checks")
    .update({
      passed: false,
      passed_at: null,
      source,
    })
    .in("task_id", taskIds)
    .eq("gate_key", gateKey)
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

export async function findTasksForPullRequest(params: {
  repo: string;
  prNumber: number;
  headSha: string;
  linkedIssueNumbers: number[];
}): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const repo = params.repo;

  const queries = [];

  if (params.linkedIssueNumbers.length > 0) {
    queries.push(
      supabase
        .from("tasks")
        .select("id")
        .eq("github_repo", repo)
        .in("github_issue_number", params.linkedIssueNumbers),
    );
  }

  queries.push(
    supabase
      .from("tasks")
      .select("id")
      .eq("github_repo", repo)
      .eq("github_pr_number", params.prNumber),
  );

  const results = await Promise.all(queries);
  const ids = new Set<string>();

  for (const result of results) {
    if (result.error) throw result.error;
    for (const row of result.data ?? []) {
      ids.add(row.id as string);
    }
  }

  if (ids.size > 0) {
    const { error } = await supabase
      .from("tasks")
      .update({
        github_pr_number: params.prNumber,
        github_head_sha: params.headSha,
      })
      .in("id", [...ids]);

    if (error) throw error;
  }

  return [...ids];
}

export async function findTasksByHeadSha(repo: string, headSha: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("id")
    .eq("github_repo", repo)
    .eq("github_head_sha", headSha);

  if (error) throw error;
  return (data ?? []).map((row) => row.id as string);
}

export async function writeAuditEvent(
  entityType: string,
  entityId: string,
  action: string,
  details: Record<string, unknown>,
  actor = "github_webhook",
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("audit_events").insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor,
    details,
  });
  if (error) throw error;
}
