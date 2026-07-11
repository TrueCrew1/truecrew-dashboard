import type { TodayWorkOrdersResponse } from "@/types/todayWorkOrders";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid Today work orders response: ${field} must be an object`);
  }
  return value;
}

function expectString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid Today work orders response: ${field} must be a string`);
  }
  return value;
}

function expectNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Invalid Today work orders response: ${field} must be a number`);
  }
  return value;
}

function expectArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid Today work orders response: ${field} must be an array`);
  }
  return value;
}

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "string") return value;
  throw new Error("Invalid Today work orders response: optional string field has wrong type");
}

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  throw new Error("Invalid Today work orders response: optional number field has wrong type");
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  throw new Error("Invalid Today work orders response: optional boolean field has wrong type");
}

function optionalStringField(value: unknown): string | undefined {
  const parsed = parseOptionalString(value);
  return parsed ?? undefined;
}

/** Runtime guard for `GET /api/today/work-orders` — validates once at the loader boundary. */
export function parseTodayWorkOrdersResponse(payload: unknown): TodayWorkOrdersResponse {
  const root = expectRecord(payload, "response");

  const org = expectRecord(root.org_context, "org_context");
  const kpi = expectRecord(root.kpi_summary, "kpi_summary");
  const meta = expectRecord(root.meta, "meta");

  const statusPrioritySummary = expectArray(
    root.status_priority_summary,
    "status_priority_summary",
  ).map((item, index) => {
    const row = expectRecord(item, `status_priority_summary[${index}]`);
    return {
      priority: expectString(row.priority, `status_priority_summary[${index}].priority`),
      status: expectString(row.status, `status_priority_summary[${index}].status`),
      count: expectNumber(row.count, `status_priority_summary[${index}].count`),
    };
  });

  const needsAttentionItems = expectArray(
    root.needs_attention_items,
    "needs_attention_items",
  ).map((item, index) => {
    const row = expectRecord(item, `needs_attention_items[${index}]`);
    return {
      id: expectString(row.id, `needs_attention_items[${index}].id`),
      kind: expectString(row.kind, `needs_attention_items[${index}].kind`),
      title: expectString(row.title, `needs_attention_items[${index}].title`),
      detail: parseOptionalString(row.detail),
      work_order_id: parseOptionalString(row.work_order_id),
      priority: parseOptionalString(row.priority),
      due_at: parseOptionalString(row.due_at),
      site_name: parseOptionalString(row.site_name),
      needs_attention: parseOptionalBoolean(row.needs_attention),
    };
  });

  const workOrderRows = expectArray(root.work_order_rows, "work_order_rows").map(
    (item, index) => {
      const row = expectRecord(item, `work_order_rows[${index}]`);
      return {
        id: expectString(row.id, `work_order_rows[${index}].id`),
        title: expectString(row.title, `work_order_rows[${index}].title`),
        status: expectString(row.status, `work_order_rows[${index}].status`),
        priority: parseOptionalString(row.priority),
        due_at: parseOptionalString(row.due_at),
        scheduled_start: parseOptionalString(row.scheduled_start),
        scheduled_end: parseOptionalString(row.scheduled_end),
        assigned_to: parseOptionalString(row.assigned_to),
        site_name: parseOptionalString(row.site_name),
        asset_name: parseOptionalString(row.asset_name),
        crew_name: parseOptionalString(row.crew_name),
        overdue: parseOptionalBoolean(row.overdue),
        due_today: parseOptionalBoolean(row.due_today),
        unassigned: parseOptionalBoolean(row.unassigned),
        blocked: parseOptionalBoolean(row.blocked),
        awaiting_approval: parseOptionalBoolean(row.awaiting_approval),
        stale: parseOptionalBoolean(row.stale),
      };
    },
  );

  let approvalAwareness: TodayWorkOrdersResponse["approval_awareness"];
  if (root.approval_awareness !== undefined) {
    const approval = expectRecord(root.approval_awareness, "approval_awareness");
    approvalAwareness = {
      pending_approval_count: expectNumber(
        approval.pending_approval_count,
        "approval_awareness.pending_approval_count",
      ),
      recent_governance_event_count: parseOptionalNumber(
        approval.recent_governance_event_count,
      ),
      auditor_note: parseOptionalString(approval.auditor_note),
    };
  }

  return {
    org_context: {
      org_id: expectString(org.org_id, "org_context.org_id"),
      org_name: expectString(org.org_name, "org_context.org_name"),
      membership_role: expectString(org.membership_role, "org_context.membership_role"),
      membership_status: expectString(
        org.membership_status,
        "org_context.membership_status",
      ),
    },
    kpi_summary: {
      open_count: expectNumber(kpi.open_count, "kpi_summary.open_count"),
      overdue_count: expectNumber(kpi.overdue_count, "kpi_summary.overdue_count"),
      due_today_count: expectNumber(kpi.due_today_count, "kpi_summary.due_today_count"),
      in_progress_count: expectNumber(kpi.in_progress_count, "kpi_summary.in_progress_count"),
      crews_on_shift_count: expectNumber(
        kpi.crews_on_shift_count,
        "kpi_summary.crews_on_shift_count",
      ),
      waiting_approval_count: expectNumber(
        kpi.waiting_approval_count,
        "kpi_summary.waiting_approval_count",
      ),
      completed_today_count: expectNumber(
        kpi.completed_today_count,
        "kpi_summary.completed_today_count",
      ),
      as_of: expectString(kpi.as_of, "kpi_summary.as_of"),
    },
    status_priority_summary: statusPrioritySummary,
    needs_attention_items: needsAttentionItems,
    work_order_rows: workOrderRows,
    approval_awareness: approvalAwareness,
    meta: {
      as_of: expectString(meta.as_of, "meta.as_of"),
      request_id: optionalStringField(meta.request_id),
      schema_version: optionalStringField(meta.schema_version),
      empty: parseOptionalBoolean(meta.empty),
    },
  };
}
