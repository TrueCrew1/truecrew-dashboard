import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { TaskRow } from "@/types/database";

export async function fetchTodayTasks(): Promise<TaskRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, gate_checks(*)")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as TaskRow[]).filter(
    (t) => !["Done", "Logged"].includes(t.stage),
  );
}

export async function fetchActiveIncidents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .lte("severity", 2)
    .not("status", "eq", "resolved")
    .order("opened_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createTask(input: {
  title: string;
  priority: string;
  stage?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title,
      priority: input.priority,
      stage: input.stage ?? "Inbox",
      workflow_type: "ticket",
      created_by: "founder",
    } as Database["public"]["Tables"]["tasks"]["Insert"])
    .select("*, gate_checks(*)")
    .single();

  if (error) throw error;
  return data as TaskRow;
}

export async function fetchAuthAuditEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("auth_audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

export async function fetchProfile(): Promise<import("@/types/database").ProfileRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function recordAuthAudit(
  action: string,
  metadata: Record<string, unknown> = {},
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  await supabase.from("auth_audit_events").insert({
    user_id: user.id,
    action,
    role: profile?.role ?? "employee",
    actor_email: user.email,
    metadata,
  } as Database["public"]["Tables"]["auth_audit_events"]["Insert"]);
}
