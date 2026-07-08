import type { TodayWorkOrdersState } from "@/hooks/useTodayWorkOrders";
import type {
  TodayApprovalAwareness,
  TodayKpiSummary,
  TodayNeedsAttentionItem,
  TodayOrgContext,
  TodayStatusPriorityItem,
  TodayWorkOrderRow,
  TodayWorkOrdersResponse,
  TodayWorkOrderStatus,
} from "@/types/todayWorkOrders";

/** Per-section async phase — maps page state to a single render branch. */
export type TodaySectionPhase<T> =
  | { phase: "loading" }
  | { phase: "empty" }
  | { phase: "ready"; data: T };

export interface TodayOrgHeaderView {
  orgName: string;
  membershipRole: string;
}

export interface TodayKpiCardView {
  label: string;
  value: number;
  meta?: string;
}

export interface TodayStatusSummaryRowView {
  key: string;
  priorityLabel: string;
  statusLabel: string;
  count: number;
}

export interface TodayAttentionRowView {
  id: string;
  title: string;
  detail?: string;
}

export type TodayStatusBadgeVariant =
  | "green"
  | "red"
  | "yellow"
  | "orange"
  | "blue"
  | "steel";

/** Exhaustive badge mapping for allowed Today work-order row statuses. */
export const TODAY_WORK_ORDER_STATUS_VARIANTS: Record<
  TodayWorkOrderStatus,
  TodayStatusBadgeVariant
> = {
  open: "steel",
  scheduled: "blue",
  in_progress: "orange",
  // Yellow — distinct from open/queued steel; signals paused/blocked-on-external state.
  waiting: "yellow",
  queued: "steel",
};

function isTodayWorkOrderStatus(value: string): value is TodayWorkOrderStatus {
  return Object.hasOwn(TODAY_WORK_ORDER_STATUS_VARIANTS, value);
}

/** Maps a response status string to a badge variant; unknown values fall back to steel. */
export function mapWorkOrderStatusVariant(status: string): TodayStatusBadgeVariant {
  const normalized = status.toLowerCase();
  if (isTodayWorkOrderStatus(normalized)) {
    return TODAY_WORK_ORDER_STATUS_VARIANTS[normalized];
  }
  if (import.meta.env.DEV) {
    console.warn(`Unknown Today work order status: ${status}`);
  }
  return "steel";
}

export interface TodayWorkOrderTableRowView {
  id: string;
  title: string;
  scheduleLabel: string;
  statusLabel: string;
  statusVariant: TodayStatusBadgeVariant;
  crewLabel: string;
}

export interface TodayApprovalNoteView {
  pendingCount: number;
  auditorNote: string;
  summaryLine: string;
}

export interface TodayScaffoldSectionsView {
  org: TodaySectionPhase<TodayOrgHeaderView>;
  kpis: TodaySectionPhase<readonly TodayKpiCardView[]>;
  statusSummary: TodaySectionPhase<readonly TodayStatusSummaryRowView[]>;
  needsAttention: TodaySectionPhase<readonly TodayAttentionRowView[]>;
  workOrders: TodaySectionPhase<readonly TodayWorkOrderTableRowView[]>;
  approval: TodaySectionPhase<TodayApprovalNoteView>;
}

export type TodayScaffoldView =
  | { kind: "error"; error: string }
  | { kind: "content"; sections: TodayScaffoldSectionsView };

const KPI_CARD_DEFS: ReadonlyArray<{
  label: string;
  pick: (kpi: TodayKpiSummary) => number;
  meta?: string;
}> = [
  { label: "Open", pick: (kpi) => kpi.open_count },
  { label: "Overdue", pick: (kpi) => kpi.overdue_count },
  { label: "Due today", pick: (kpi) => kpi.due_today_count },
  { label: "In progress", pick: (kpi) => kpi.in_progress_count },
  { label: "Crews on shift", pick: (kpi) => kpi.crews_on_shift_count },
  {
    label: "Waiting approval",
    pick: (kpi) => kpi.waiting_approval_count,
    meta: "Backend-mediated (ADR-002)",
  },
  { label: "Completed today", pick: (kpi) => kpi.completed_today_count },
];

const DEFAULT_AUDITOR_NOTE =
  "ADR-001 observability only — approvals are logged for review, not authorization.";

function formatPriorityLabel(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatWorkOrderSchedule(row: TodayWorkOrderRow): string {
  if (row.status === "in_progress") return "Active now";
  if (row.scheduled_start && row.scheduled_end) {
    const start = new Date(row.scheduled_start);
    const end = new Date(row.scheduled_end);
    const sameDay = start.toDateString() === end.toDateString();
    const time = (d: Date) =>
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (sameDay) return `${time(start)}–${time(end)}`;
    return `${start.toLocaleString()} – ${end.toLocaleString()}`;
  }
  if (row.scheduled_start) {
    const start = new Date(row.scheduled_start);
    return start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (row.due_at) {
    return new Date(row.due_at).toLocaleString();
  }
  return "—";
}

function listSectionPhase<T>(
  loading: boolean,
  pageEmpty: boolean,
  items: readonly T[],
): TodaySectionPhase<readonly T[]> {
  if (loading) return { phase: "loading" };
  if (pageEmpty || items.length === 0) return { phase: "empty" };
  return { phase: "ready", data: items };
}

function mapOrg(org: TodayOrgContext): TodayOrgHeaderView {
  return {
    orgName: org.org_name,
    membershipRole: org.membership_role,
  };
}

function mapKpis(kpi: TodayKpiSummary): readonly TodayKpiCardView[] {
  return KPI_CARD_DEFS.map(({ label, pick, meta }) => ({
    label,
    value: pick(kpi),
    meta,
  }));
}

function mapStatusSummary(
  rows: TodayStatusPriorityItem[],
): readonly TodayStatusSummaryRowView[] {
  return rows.map((row) => ({
    key: `${row.priority}-${row.status}`,
    priorityLabel: formatPriorityLabel(String(row.priority)),
    statusLabel: formatStatusLabel(row.status),
    count: row.count,
  }));
}

function mapAttentionItems(
  items: TodayNeedsAttentionItem[],
): readonly TodayAttentionRowView[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    detail: item.detail ?? undefined,
  }));
}

function mapWorkOrderRows(
  rows: TodayWorkOrderRow[],
): readonly TodayWorkOrderTableRowView[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    scheduleLabel: formatWorkOrderSchedule(row),
    statusLabel: formatStatusLabel(row.status),
    statusVariant: mapWorkOrderStatusVariant(row.status),
    crewLabel: row.crew_name ?? "Unassigned",
  }));
}

function mapApproval(
  awareness: TodayApprovalAwareness | undefined,
): TodayApprovalNoteView {
  const pendingCount = awareness?.pending_approval_count ?? 0;
  const auditorNote = awareness?.auditor_note ?? DEFAULT_AUDITOR_NOTE;
  const summaryLine =
    pendingCount > 0
      ? `${pendingCount} pending approval${pendingCount === 1 ? "" : "s"} for this org.`
      : "No pending approvals for this org.";

  return { pendingCount, auditorNote, summaryLine };
}

function buildSectionsFromResponse(
  data: TodayWorkOrdersResponse,
  pageEmpty: boolean,
): TodayScaffoldSectionsView {
  return {
    org: { phase: "ready", data: mapOrg(data.org_context) },
    kpis: { phase: "ready", data: mapKpis(data.kpi_summary) },
    statusSummary: listSectionPhase(
      false,
      pageEmpty,
      mapStatusSummary(data.status_priority_summary),
    ),
    needsAttention: listSectionPhase(
      false,
      pageEmpty,
      mapAttentionItems(data.needs_attention_items),
    ),
    workOrders: listSectionPhase(false, pageEmpty, mapWorkOrderRows(data.work_order_rows)),
    approval: { phase: "ready", data: mapApproval(data.approval_awareness) },
  };
}

const LOADING_SECTIONS: TodayScaffoldSectionsView = {
  org: { phase: "loading" },
  kpis: { phase: "loading" },
  statusSummary: { phase: "loading" },
  needsAttention: { phase: "loading" },
  workOrders: { phase: "loading" },
  approval: { phase: "loading" },
};

/** Maps page-level async state to section view models for presentational rendering. */
export function buildTodayScaffoldView(state: TodayWorkOrdersState): TodayScaffoldView {
  if (state.status === "error") {
    return { kind: "error", error: state.error };
  }

  if (state.status === "loading") {
    return { kind: "content", sections: LOADING_SECTIONS };
  }

  const pageEmpty = state.status === "empty";
  return {
    kind: "content",
    sections: buildSectionsFromResponse(state.data, pageEmpty),
  };
}
