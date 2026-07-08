import {
  buildKpiSummary,
  buildWorkOrderRows,
  fetchWorkOrderTasks,
} from "./workOrderTasks.js";
import type {
  TodayOrgContext,
  TodayWorkOrdersResponse,
} from "../../src/types/todayWorkOrders.js";

/**
 * v1 real-data pass — `work_order_rows` and `kpi_summary` are derived from the
 * `tasks` table (`workflow_type` in repair/ticket). `status_priority_summary`
 * and `needs_attention_items` stay empty until their derivation is reviewed;
 * fields with no backing column (site/asset/crew/schedule) stay null rather
 * than guessed.
 */
export async function buildRealTodayWorkOrdersResponse(
  orgContext: TodayOrgContext,
): Promise<TodayWorkOrdersResponse> {
  const now = new Date();
  const tasks = await fetchWorkOrderTasks();
  const workOrderRows = buildWorkOrderRows(tasks, now);

  return {
    org_context: orgContext,
    kpi_summary: buildKpiSummary(tasks, now),
    status_priority_summary: [],
    needs_attention_items: [],
    work_order_rows: workOrderRows,
    meta: {
      as_of: now.toISOString(),
      schema_version: "1",
      // Empty when no open-stage rows — completed-today KPI may still be > 0.
      empty: workOrderRows.length === 0,
    },
  };
}
