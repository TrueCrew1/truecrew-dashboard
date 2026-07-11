import type { TodayWorkOrdersResponse } from "@/types/todayWorkOrders";

const asOf = new Date().toISOString();

/**
 * Typed fixture for the Today work-orders page read model.
 * Matches `TodayWorkOrdersResponse` — used by the mock loader until
 * `GET /api/today/work-orders` exists.
 */
export const todayWorkOrdersMock: TodayWorkOrdersResponse = {
  org_context: {
    org_id: "org-demo-field-001",
    org_name: "Demo Field Services",
    membership_role: "Supervisor",
    membership_status: "active",
  },
  kpi_summary: {
    open_count: 14,
    overdue_count: 2,
    due_today_count: 5,
    in_progress_count: 2,
    crews_on_shift_count: 2,
    waiting_approval_count: 1,
    completed_today_count: 3,
    as_of: asOf,
  },
  status_priority_summary: [
    { priority: "critical", status: "open", count: 1 },
    { priority: "critical", status: "in_progress", count: 0 },
    { priority: "critical", status: "waiting", count: 0 },
    { priority: "high", status: "open", count: 3 },
    { priority: "high", status: "in_progress", count: 1 },
    { priority: "high", status: "waiting", count: 1 },
    { priority: "normal", status: "open", count: 6 },
    { priority: "normal", status: "in_progress", count: 1 },
    { priority: "normal", status: "waiting", count: 0 },
    { priority: "low", status: "open", count: 2 },
    { priority: "low", status: "in_progress", count: 0 },
    { priority: "low", status: "waiting", count: 0 },
  ],
  needs_attention_items: [
    {
      id: "attn-1",
      kind: "overdue",
      title: "Overdue PM — north pump skid",
      detail: "WO-1031 · due yesterday · Site B",
      work_order_id: "wo-1031",
      priority: "high",
      site_name: "Site B",
      needs_attention: true,
    },
    {
      id: "attn-2",
      kind: "blocked",
      title: "Blocked work order — conveyor alignment",
      detail: "Awaiting parts approval · Crew B",
      work_order_id: "wo-1038",
      priority: "normal",
      needs_attention: true,
    },
  ],
  work_order_rows: [
    {
      id: "wo-1042",
      title: "WO-1042 · Pump seal replacement",
      status: "scheduled",
      priority: "high",
      scheduled_start: "2026-07-07T08:00:00.000Z",
      scheduled_end: "2026-07-07T12:00:00.000Z",
      crew_name: "Crew A",
      site_name: "Site A",
      due_today: true,
    },
    {
      id: "wo-1038",
      title: "WO-1038 · Conveyor belt alignment",
      status: "in_progress",
      priority: "normal",
      crew_name: "Crew B",
      site_name: "Site C",
      blocked: true,
      due_today: true,
    },
    {
      id: "wo-1051",
      title: "WO-1051 · HVAC filter swap",
      status: "queued",
      priority: "low",
      scheduled_start: "2026-07-07T14:00:00.000Z",
      crew_name: null,
      site_name: "Site A",
      unassigned: true,
      due_today: true,
    },
  ],
  approval_awareness: {
    pending_approval_count: 1,
    recent_governance_event_count: 0,
    auditor_note:
      "ADR-001 observability only — approvals do not gate work-order reads in v1.",
  },
  meta: {
    as_of: asOf,
    schema_version: "1",
    empty: false,
  },
};
