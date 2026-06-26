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

export async function fetchWorkOrders(): Promise<
  import("@/types/database").WorkOrderRow[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("*, crews(id, name, slug), assets(id, name, legacy_id)")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as import("@/types/database").WorkOrderRow[];
}

export async function fetchWorkOrderById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("*, crews(id, name, slug, site_name, availability), assets(id, name, legacy_id, asset_type, status)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as import("@/types/database").WorkOrderRow;
}

export async function fetchAssets(): Promise<import("@/types/database").AssetRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*, crews(id, name, slug)")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as import("@/types/database").AssetRow[];
}

export async function fetchAssetById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*, crews(id, name, slug, site_name, lead_name)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as import("@/types/database").AssetRow;
}

export async function fetchCrews(): Promise<import("@/types/database").CrewRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crews")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as import("@/types/database").CrewRow[];
}

export async function fetchCrewById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crews")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as import("@/types/database").CrewRow;
}

export async function fetchWorkOrdersByCrewId(crewId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("id, title, status, priority, due_at")
    .eq("crew_id", crewId)
    .in("status", ["draft", "open", "in_progress", "blocked", "waiting"])
    .order("due_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchAssetsByCrewId(crewId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("id, name, asset_type, status")
    .eq("crew_id", crewId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
