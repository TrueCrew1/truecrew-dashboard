import { getSupabaseAdmin, type DbTaskRow } from "../supabase/admin.js";
import type {
  TodayKpiSummary,
  TodayWorkOrderRow,
} from "../../src/types/todayWorkOrders.js";

/**
 * v1 "work order" scope — tasks whose `workflow_type` represents field
 * operations rather than engineering workflow (build/deploy/onboarding/decision).
 */
export const WORK_ORDER_WORKFLOW_TYPES = ["repair", "ticket"] as const;

const OPEN_STAGES = ["Inbox", "Triage", "Planned", "In Progress", "Waiting", "Review"];

function mapStageToStatus(stage: string): string {
  switch (stage) {
    case "Inbox":
    case "Triage":
      return "open";
    case "Planned":
      return "scheduled";
    case "In Progress":
      return "in_progress";
    case "Waiting":
    case "Review":
      return "waiting";
    case "Done":
    case "Logged":
      return "completed";
    default:
      return stage.toLowerCase().replace(/\s+/g, "_");
  }
}

function mapPriorityLabel(priority: string): string {
  return priority === "medium" ? "normal" : priority;
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export async function fetchWorkOrderTasks(): Promise<DbTaskRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .in("workflow_type", [...WORK_ORDER_WORKFLOW_TYPES])
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as DbTaskRow[];
}

/** No crew/approval data source yet — those two counts stay 0, not guessed. */
export function buildKpiSummary(tasks: DbTaskRow[], now: Date): TodayKpiSummary {
  let openCount = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let inProgressCount = 0;
  let completedTodayCount = 0;

  for (const task of tasks) {
    const isOpenStage = OPEN_STAGES.includes(task.stage);
    if (isOpenStage) openCount += 1;
    if (task.stage === "In Progress") inProgressCount += 1;

    if (task.due_at) {
      const dueAt = new Date(task.due_at);
      if (isOpenStage && dueAt.getTime() < now.getTime()) overdueCount += 1;
      if (isSameUtcDay(dueAt, now)) dueTodayCount += 1;
    }

    if (task.stage === "Done" && isSameUtcDay(new Date(task.updated_at), now)) {
      completedTodayCount += 1;
    }
  }

  return {
    open_count: openCount,
    overdue_count: overdueCount,
    due_today_count: dueTodayCount,
    in_progress_count: inProgressCount,
    crews_on_shift_count: 0,
    waiting_approval_count: 0,
    completed_today_count: completedTodayCount,
    as_of: now.toISOString(),
  };
}

/** Active/scheduled rows only — excludes Done/Logged (see kpi `completed_today_count`). */
export function buildWorkOrderRows(tasks: DbTaskRow[], now: Date): TodayWorkOrderRow[] {
  return tasks
    .filter((task) => OPEN_STAGES.includes(task.stage))
    .map((task) => {
      const overdue =
        Boolean(task.due_at) && new Date(task.due_at!).getTime() < now.getTime();
      const dueToday = Boolean(task.due_at) && isSameUtcDay(new Date(task.due_at!), now);

      return {
        id: task.id,
        title: task.title,
        status: mapStageToStatus(task.stage),
        priority: mapPriorityLabel(task.priority),
        due_at: task.due_at,
        scheduled_start: null,
        scheduled_end: null,
        assigned_to: task.assignee,
        site_name: null,
        asset_name: null,
        crew_name: null,
        overdue,
        due_today: dueToday,
        unassigned: !task.assignee,
        blocked: Boolean(task.blocker),
        awaiting_approval: false,
        stale: false,
      };
    });
}
