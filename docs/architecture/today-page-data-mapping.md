# Today Page Data Mapping

## Purpose

- Maps the existing **Today** page scaffold to the planned `GET /api/today/work-orders`
  response shape so UI wiring can proceed section-by-section without redesign.
- References [today-work-orders-read-model.md](./today-work-orders-read-model.md) and
  [today-work-orders-endpoint-contract.md](./today-work-orders-endpoint-contract.md).
- **Planning only** — no fetch hook, route handler, or live data binding exists yet.

## Response source

| | |
|---|---|
| **Endpoint** | `GET /api/today/work-orders` |
| **Types** | [`src/types/todayWorkOrders.ts`](../../src/types/todayWorkOrders.ts) — `TodayWorkOrdersResponse` |
| **Page entry** | [`src/pages/TodayPage.tsx`](../../src/pages/TodayPage.tsx) |
| **Scaffold** | [`src/pages/todayWorkOrdersScaffold.tsx`](../../src/pages/todayWorkOrdersScaffold.tsx) |

One request returns the full page payload; the scaffold components below become prop-driven
views over a single `TodayWorkOrdersResponse` (or per-section props sliced from it).

## Section mapping

| Scaffold (file / component) | Response key | Primary fields |
|---|---|---|
| `PageHeader` + `TodayOrgContextHeader` (`todayWorkOrdersScaffold.tsx`) | `org_context` | `org_name`, `membership_role`, `membership_status` |
| `TodayKpiCards` — `ShiftStatsStrip` + `StatGrid` | `kpi_summary` | `open_count`, `overdue_count`, `due_today_count`, `in_progress_count`, `crews_on_shift_count`, `waiting_approval_count`, `completed_today_count`, `as_of` |
| `WorkOrderStatusSummary` | `status_priority_summary` | `priority`, `status`, `count` per row |
| `NeedsAttentionList` | `needs_attention_items` | `id`, `kind`, `title`, `detail`, `work_order_id`, `priority`, `due_at`, `site_name` |
| `TodaysWorkList` | `work_order_rows` | `id`, `title`, `status`, `priority`, `due_at`, `scheduled_start`, `scheduled_end`, `assigned_to`, `site_name`, `asset_name`, `crew_name`, row flags (`overdue`, `blocked`, etc.) |
| `AuditorAwarenessNote` | `approval_awareness` (optional) | `pending_approval_count`, `recent_governance_event_count`, `auditor_note` |
| Intent note / future footer | `meta` | `as_of`, `request_id`, `schema_version`, `empty` |

**Not mapped to endpoint (legacy, below scaffold):** `ChiefHomePanel`, focus queue, active
incidents, and blocking gates in `TodayPage.tsx` — retire or re-home when work-order APIs
replace that slice.

**Remove when wired:** `TodayScaffoldIntentNote` planning banner and inline placeholder
constants in `todayWorkOrdersScaffold.tsx`.

## Fetch-state plan

The page owns one fetch lifecycle for `/api/today/work-orders`. Four states:

### `loading`

**When:** Initial mount, org switch (future), or explicit refresh before the first successful
response for the current request.

**Render:** Keep page chrome (`PageHeader`, org header skeleton). Show skeleton or spinner
placeholders inside KPI cards, summary table, attention list, and work list panels. Do not
show empty-state copy or error text yet. Legacy backlog panels may stay hidden or skeletonized
until the primary payload resolves.

### `error`

**When:** Network failure, `5xx`, or non-recoverable parse error. Distinct from `401` / `403`
(access failures handled per endpoint contract — see Notes).

**Render:** Full-width retryable error in the work-order scaffold region with a retry action.
Do not render placeholder mock rows as if they were real data. Preserve navigation shell;
optionally hide KPI/list panels rather than showing stale zeros.

### `empty`

**When:** `200` with valid `org_context` and `meta.empty === true` (or zeroed KPIs plus empty
arrays) — user has membership but no work orders / attention items for today.

**Render:** Real empty states per section (`PanelEmpty` or equivalent): zero KPI values from
`kpi_summary`, empty tables with helpful copy (“No work scheduled today”), not an error banner.
Org header shows live `org_context`. Approval awareness may show zero pending count.

### `ready`

**When:** `200` with a populated `TodayWorkOrdersResponse` and `meta.empty !== true` (or lists
contain rows).

**Render:** Bind each scaffold section to its mapped response key. Row flags drive badges
(overdue, blocked). `meta.as_of` available for freshness display. Legacy backlog remains
optional below until removed.

## Notes

- **Reconciliation:** `kpi_summary` counts and visible rows in `work_order_rows` /
  `needs_attention_items` must come from the same response — do not re-aggregate on the client.
- **No client org authorization:** The UI must not choose org scope from query params or JWT
  alone; display `org_context` returned by the server after live membership resolution (ADR-002).
- **Empty ≠ access failure:** `empty` is a successful org-scoped snapshot with no rows;
  `401` / `403` are auth/membership failures with different copy and no fake KPI zeros passed
  off as operational truth.

## Status

Planning-only mapping. No UI wiring, fetch hook, or runtime behavior is implemented by this document.
