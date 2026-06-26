import { getSupabaseAdmin } from "./admin";

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
