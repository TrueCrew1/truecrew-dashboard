import type {
  TodayOrgContext,
  TodayWorkOrdersResponse,
} from "../../src/types/todayWorkOrders.js";

/** Structurally valid empty page snapshot for v1 (no work_orders data source yet). */
export function buildEmptyTodayWorkOrdersResponse(
  orgContext: TodayOrgContext,
): TodayWorkOrdersResponse {
  const asOf = new Date().toISOString();

  return {
    org_context: orgContext,
    kpi_summary: {
      open_count: 0,
      overdue_count: 0,
      due_today_count: 0,
      in_progress_count: 0,
      crews_on_shift_count: 0,
      waiting_approval_count: 0,
      completed_today_count: 0,
      as_of: asOf,
    },
    status_priority_summary: [],
    needs_attention_items: [],
    work_order_rows: [],
    approval_awareness: {
      pending_approval_count: 0,
      recent_governance_event_count: 0,
      auditor_note:
        "ADR-001 observability only — approvals do not gate work-order reads in v1.",
    },
    meta: {
      as_of: asOf,
      schema_version: "1",
      empty: true,
    },
  };
}
