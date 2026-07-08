/**
 * Planned response contract for `GET /api/today/work-orders`.
 *
 * Reflects ADR-002 backend mediation: org scope is resolved server-side from live
 * memberships; work_orders remain backend-mediated (no direct client RLS). These
 * types document the intended page read model only — no endpoint implementation
 * is implied.
 *
 * @see docs/architecture/today-work-orders-endpoint-contract.md
 * @see docs/architecture/today-work-orders-read-model.md
 */

/** Rollup priority label — final enum TBD when schema exists. */
export type TodayWorkOrderPriority = "critical" | "high" | "normal" | "low";

/**
 * Canonical work-order row / rollup status vocabulary for the Today read model.
 * Parser accepts any string; narrow at the view-adapter boundary only.
 */
export type TodayWorkOrderStatus =
  | "open"
  | "scheduled"
  | "in_progress"
  | "waiting"
  | "queued";

export interface TodayOrgContext {
  org_id: string;
  org_name: string;
  membership_role: string;
  membership_status: string;
}

export interface TodayKpiSummary {
  open_count: number;
  overdue_count: number;
  due_today_count: number;
  in_progress_count: number;
  crews_on_shift_count: number;
  waiting_approval_count: number;
  completed_today_count: number;
  as_of: string;
}

export interface TodayStatusPriorityItem {
  priority: TodayWorkOrderPriority | string;
  status: string;
  count: number;
}

export interface TodayNeedsAttentionItem {
  id: string;
  kind: string;
  title: string;
  detail?: string | null;
  work_order_id?: string | null;
  priority?: TodayWorkOrderPriority | string | null;
  due_at?: string | null;
  site_name?: string | null;
  needs_attention?: boolean;
}

export interface TodayWorkOrderRow {
  id: string;
  title: string;
  status: string;
  priority?: TodayWorkOrderPriority | string | null;
  due_at?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  assigned_to?: string | null;
  site_name?: string | null;
  asset_name?: string | null;
  crew_name?: string | null;
  /** Backend-computed flags for the row (ADR-002 read model). */
  overdue?: boolean;
  due_today?: boolean;
  unassigned?: boolean;
  blocked?: boolean;
  awaiting_approval?: boolean;
  stale?: boolean;
}

export interface TodayApprovalAwareness {
  pending_approval_count: number;
  recent_governance_event_count?: number | null;
  auditor_note?: string | null;
}

export interface TodayMeta {
  as_of: string;
  request_id?: string;
  schema_version?: string;
  empty?: boolean;
}

export interface TodayWorkOrdersResponse {
  org_context: TodayOrgContext;
  kpi_summary: TodayKpiSummary;
  status_priority_summary: TodayStatusPriorityItem[];
  needs_attention_items: TodayNeedsAttentionItem[];
  work_order_rows: TodayWorkOrderRow[];
  approval_awareness?: TodayApprovalAwareness;
  meta: TodayMeta;
}
