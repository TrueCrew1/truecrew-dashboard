# Today Status & Priority Vocabulary

## Purpose

This document captures the **status and priority vocabulary** used by the Today work-orders
dashboard — across the response contract, mock fixture, runtime parser, and frontend view adapter.

The goal is to keep backend aggregation, `TodayWorkOrdersResponse`, and UI badge/label logic
aligned before live `work_orders` data is wired. It records what the repo uses **today** and
where vocabulary already drifts.

Related docs:

- [today-work-orders-endpoint-contract.md](./today-work-orders-endpoint-contract.md)
- [today-work-orders-read-model.md](./today-work-orders-read-model.md)
- Types: [`src/types/todayWorkOrders.ts`](../../src/types/todayWorkOrders.ts)
- Mock: [`src/data/todayWorkOrdersMock.ts`](../../src/data/todayWorkOrdersMock.ts)
- Adapter: [`src/pages/todayWorkOrdersView.ts`](../../src/pages/todayWorkOrdersView.ts)

---

## Current status fields

### `status_priority_summary[].status`

Used in the mock fixture and read-model examples as **rollup bucket** labels:

| Status | In mock (`todayWorkOrdersMock`) |
|--------|----------------------------------|
| `open` | Yes |
| `in_progress` | Yes |
| `waiting` | Yes |

The read-model doc also mentions `scheduled` as a candidate rollup status, but the mock does
**not** include it in `status_priority_summary`.

**Type / parser behavior:** `TodayStatusPriorityItem.status` is typed as `string`. The runtime
parser (`parseTodayWorkOrdersResponse`) accepts any non-empty string — no enum validation.

### `work_order_rows[].status`

Used in the mock as **row-level** shift states:

| Status | In mock | Notes |
|--------|---------|-------|
| `scheduled` | Yes | WO-1042 |
| `in_progress` | Yes | WO-1038; also used for schedule label `"Active now"` |
| `queued` | Yes | WO-1051 |

**Not in mock rows but recognized by the adapter** (see UI mapping): `open`, `completed`,
`blocked`, `overdue`.

### Summary vs row vocabulary

| Appears in summary | Appears in rows | Gap |
|--------------------|-----------------|-----|
| `open` | (via adapter only) | Summary uses `open`; rows use `queued` for a similar bucket |
| `in_progress` | `in_progress` | Aligned |
| `waiting` | — | Summary only; no row example |
| — | `scheduled` | Row only; not in summary matrix |
| — | `queued` | Row only; adapter maps like `open` (steel badge) |

There is **no single shared status enum** yet. `waiting` and `queued` are not treated as
synonyms in code — only similar visually via the steel fallback.

---

## Current priority fields

### Today response types / mock

`TodayWorkOrderPriority` in [`src/types/todayWorkOrders.ts`](../../src/types/todayWorkOrders.ts):

```
critical | high | normal | low
```

Mock usage:

| Priority | `status_priority_summary` | `work_order_rows` | `needs_attention_items` |
|----------|---------------------------|-------------------|-------------------------|
| `critical` | Yes | — | — |
| `high` | Yes | WO-1042 | attn-1 |
| `normal` | Yes | WO-1038 | attn-2 |
| `low` | Yes | WO-1051 | — |

Fields are typed as `TodayWorkOrderPriority | string` in several places — the parser accepts
any string for priority.

### Other repo sources (not yet wired to Today)

| Source | Priority values | Status values |
|--------|-----------------|---------------|
| `tasks` table (`supabase/migrations/…`) | `critical`, `high`, **`medium`**, `low` | task `stage` via `WorkflowStage` (inbox, triage, planned, …) — different domain |
| `TaskPriority` (`src/types/index.ts`) | `critical`, `high`, **`medium`**, `low` | — |
| Legacy mock tasks (`src/data/mockData.ts`) | uses `medium` | — |
| Read-model doc (planning) | critical, high, **normal**, low | open, in_progress, waiting, scheduled |

### Suspected mismatches

- **`normal` (Today) vs `medium` (tasks / DB)** — most likely drift when mapping `tasks` or a
  future `work_orders.priority` column into `TodayWorkOrdersResponse`.
- **Task `stage` vs work-order `status`** — legacy operator panels use workflow stages; Today
  uses operational WO statuses. These must not be conflated at the query boundary.
- **Read-model doc lists `scheduled` in summary** — mock summary omits it; row mock uses it.

---

## UI mapping behavior today

Adapter logic lives in [`src/pages/todayWorkOrdersView.ts`](../../src/pages/todayWorkOrdersView.ts).

### Status → badge variant (`mapWorkOrderStatusVariant`)

Exhaustive mapping via `TODAY_WORK_ORDER_STATUS_VARIANTS`; comparison is case-insensitive after lowercasing.

| Status input | Badge variant | Display label (`formatStatusLabel`) |
|--------------|---------------|-------------------------------------|
| `in_progress` | `orange` | `In Progress` |
| `scheduled` | `blue` | `Scheduled` |
| `waiting` | `yellow` | `Waiting` |
| `queued` | `steel` | `Queued` |
| `open` | `steel` | `Open` |
| **anything else** | **`steel`** (dev warning) | Title-cased from snake_case |

### Schedule label (`formatWorkOrderSchedule`)

- `in_progress` → `"Active now"` (ignores `scheduled_start` / `scheduled_end`)
- Otherwise uses schedule timestamps or `due_at`; unknown → `"—"`

### Priority → display

- `formatPriorityLabel`: capitalizes first character only (`normal` → `Normal`).
- No priority-specific badge colors; priority appears as plain text in the summary table and
  is not mapped to `StatusBadge` variants on work-order rows.

### Summary table

- Status and priority pass through formatters only — **no variant mapping** on
  `status_priority_summary` rows.

### Silent fallback

Unknown row statuses render with the **steel** badge — same as `queued` and `open`. That is
tolerable for empty-v1 and mock-only data, but **hides backend vocabulary mistakes** once real
rows flow.

---

## Drift risks

- **Summary matrix vs row list use different status sets** — e.g. `waiting` in rollup but
  `queued` on rows; supervisors may see counts that do not match row labels they expect.
- **Row status appears in data but not in summary** — `scheduled` and `queued` rows exist in the
  mock with no corresponding summary cells; KPI reconciliation will fail when data is live.
- **Summary status appears with no row mapping** — `waiting` has no row example and no distinct
  badge treatment (summary is text-only anyway).
- **Unknown statuses are indistinguishable** — any new backend value (e.g. `on_hold`) renders
  like `queued` / `open` (steel) with no dev-time warning.
- **`normal` vs `medium` at the DB boundary** — tasks and migrations use `medium`; Today types
  and mock use `normal`; a pass-through query would leak `medium` into UI labels unless
  translated.
- **Parser permissiveness** — `parseTodayWorkOrdersResponse` validates shape but not vocabulary,
  so drift reaches the adapter silently until UI tests or exhaustive mapping catch it.

---

## Recommended next steps (code)

Small, targeted follow-up — not a broad refactor:

1. **Extract shared unions** in `src/types/todayWorkOrders.ts` (or a sibling module):
   - `TodayWorkOrderStatus` — single canonical set covering both summary buckets and row states,
     with documented synonyms (e.g. whether `waiting` and `queued` collapse).
   - `TodayWorkOrderPriority` — finalize `normal` vs `medium`; pick one contract value and map at
     the backend.

2. **Make the adapter exhaustive** — replace `workOrderStatusVariant`’s default `steel` with a
   `switch` or record keyed by `TodayWorkOrderStatus`; use a deliberate `unknown` / dev-only
   path (or explicit `steel` + log) for values outside the union.

3. **Tighten the parser (optional, after unions)** — validate `status` and `priority` fields
   against the unions at the loader boundary, or accept strings but warn in development.

4. **Add DB → contract translation at the backend query boundary** — when `work_orders` (or
   interim task queries) feed `api/today/work-orders`, map storage enums to contract enums in
   one module (e.g. `lib/today/mapWorkOrderRow.ts`), not in the React adapter.

5. **Reconcile summary aggregation with row statuses** — ensure rollup SQL/API uses the same
   canonical status set so `status_priority_summary` counts match `work_order_rows`.

---

## Status

Documentation only — **no runtime behavior changed** by this file.

**Update (v1.1):** `kpi_summary` and `work_order_rows` are now real (see
[today-work-orders-endpoint-contract.md](./today-work-orders-endpoint-contract.md)). Step 4 of
"Recommended next steps" above is implemented — `lib/today/workOrderTasks.ts`
(`mapStageToStatus`, `mapPriorityLabel`) does the DB → contract translation at the query
boundary, not in the frontend adapter. `medium` is translated to `normal` there.

Real `work_order_rows[].status` values are now constrained by `mapStageToStatus` and the
`OPEN_STAGES` row filter: only `open`, `scheduled`, `in_progress`, and `waiting` can appear
(`queued` is never emitted — it was mock-only; `completed` is never emitted either, since
`Done`/`Logged` tasks are excluded from rows entirely and only counted in
`kpi_summary.completed_today_count`). `waiting` now maps to the `yellow` badge variant in
`mapWorkOrderStatusVariant` (`TODAY_WORK_ORDER_STATUS_VARIANTS` in `src/pages/todayWorkOrdersView.ts`).

`status_priority_summary` and `needs_attention_items` remain empty arrays — vocabulary drift
for those two sections is still latent until they're wired.
