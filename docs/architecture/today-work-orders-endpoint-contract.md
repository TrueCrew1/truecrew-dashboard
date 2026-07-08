# Today Work Orders Endpoint Contract

## Purpose

- Defines the first concrete HTTP contract for the multi-tenant **Today** dashboard
  (`TodayPage` / work-order scaffold) — one read-only request that returns the full page
  payload described in [today-work-orders-read-model.md](./today-work-orders-read-model.md).
- Under [ADR-002](../decisions/ADR-002-auth-trust-boundary.md), `work_orders` stay
  **backend-mediated**; the server resolves org scope from live `memberships` and aggregates
  operational data before any response reaches the client.
- Separates page contract from a generic work-orders CRUD API so the Today view can evolve
  (KPI rollups, attention heuristics, auditor awareness) without forcing every consumer through
  the same shape.

## Proposed endpoint

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/today/work-orders` |

This is a **page-specific read model**, not a generic `work_orders` collection API. It exists
to power one supervisor command-center screen with a stable, org-scoped snapshot — not to
replace list/detail endpoints for individual work-order management.

## Request rules

- **Authenticated session required** — caller must present a valid session (e.g. Supabase JWT or
  equivalent); anonymous access returns `401`.
- **Org scope resolved from live membership** — the server selects the active organization from
  the caller's `memberships` row(s) at request time; role and visibility derive from that row.
- **No client-controlled `org_id` for authorization** — query params or headers must not be the
  sole basis for org access. An org switcher may send a *hint* later, but the server must
  re-validate membership before scoping data (JWT hints are UX-only per ADR-002).
- **Dashboard filters are optional and secondary** — safe, non-authoritative query params (e.g.
  `priority`, `site_id`) may narrow *display* within the already-authorized org scope; they must
  not widen scope or bypass membership checks.

## Response expectations

Top-level JSON sections (names align with the read-model doc):

- **`org_context`** — `org_id`, `org_name`, `membership_role`, `membership_status`.
- **`kpi_summary`** — shift-level counts (`open_count`, `overdue_count`, `due_today_count`, etc.)
  plus `as_of` timestamp.
- **`status_priority_summary`** — rollup rows: `priority`, `status`, `count` per cell.
- **`needs_attention_items`** — array of escalations/blockers with `kind`, `title`, `detail`, and
  optional `work_order_id`.
- **`work_order_rows`** — today's active and scheduled work orders for the org.
- **`approval_awareness`** — optional ADR-001 observability payload (`pending_approval_count`,
  awareness note); not an authorization gate.
- **`meta`** — request id, `as_of`, schema/version hint, and empty-state flags for the UI.

**Reconciliation:** KPI counts and list rows must be computed from the same org scope and the
same request snapshot so summary numbers match what a supervisor would see in
`work_order_rows` and `needs_attention_items` for that org.

**TypeScript contract:** Response shapes are scaffolded in
[`src/types/todayWorkOrders.ts`](../../src/types/todayWorkOrders.ts) (`TodayWorkOrdersResponse`
and section interfaces). Planning only — not wired to a route or UI yet.

## Error / empty-state semantics

- **`401 Unauthorized`** — missing or invalid session; UI shows sign-in / session expired state.
- **`403 No active membership`** — authenticated user has no active `memberships` row for a
  resolvable org; UI shows org-access empty state (not a generic 404).
- **`200` with org-scoped empty dataset** — valid membership but zero work orders / attention
  items for today; response includes zeroed KPIs and empty arrays with `meta.empty: true` (or
  per-section flags) so the page renders real empty states, not errors.
- **`503` / `500` temporary backend failure** — aggregation or database unavailable; UI shows
  retryable error with no partial fake data; do not cache stale snapshots as success.

## Status

**v1.1 — first real-data pass.** `api/today/work-orders.ts` serves real `work_order_rows` and
`kpi_summary` when Supabase is configured, derived from the `tasks` table filtered to
`workflow_type in ('repair', 'ticket')` (`lib/today/workOrderTasks.ts`). No dedicated
`work_orders` table or memberships lookup yet — this reuses the existing task schema honestly,
not a new data model.

**Real vs still-empty sections:**

| Section | Status |
|---|---|
| `org_context` | Real — env-configured (unchanged since v1) |
| `kpi_summary` | Real — `open/overdue/due_today/in_progress/completed_today_count` derived from tasks; `crews_on_shift_count` and `waiting_approval_count` stay `0` (no data source) |
| `work_order_rows` | Real — mapped from tasks; `site_name`/`asset_name`/`crew_name`/`scheduled_start`/`scheduled_end` stay `null` (no backing column). Filtered to open-stage tasks (`Inbox`/`Triage`/`Planned`/`In Progress`/`Waiting`/`Review`) — `Done`/`Logged` tasks never appear as rows, only in `kpi_summary.completed_today_count` |
| `status_priority_summary` | Still empty — deferred, not derived this pass |
| `needs_attention_items` | Still empty — deferred, not derived this pass |
| `approval_awareness` | Still omitted |

If Supabase is not configured, the route falls back to the v1 structurally-valid empty response
unchanged (not an error).

### v1.1 runtime behavior

| Status | When |
|--------|------|
| **401** | Missing/invalid `x-internal-key`, or `INTERNAL_API_SECRET` not configured (`requireInternalAuth`) |
| **403** | Auth OK but `TODAY_ORG_ID` and/or `TODAY_ORG_NAME` are not set |
| **200 (empty)** | Auth + org OK, Supabase not configured — zeroed KPIs, empty arrays, `meta.empty: true` |
| **200 (real)** | Auth + org OK, Supabase configured — real `kpi_summary`/`work_order_rows`; `meta.empty` reflects actual row count |
| **500** | Auth + org OK, Supabase configured, but the query/build step failed |
| **405** | Non-`GET` method |

Server env (Vercel): `TODAY_ORG_ID`, `TODAY_ORG_NAME`; optional `TODAY_MEMBERSHIP_ROLE`,
`TODAY_MEMBERSHIP_STATUS` (default `Supervisor` / `active`); `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` (existing convention) gate the real-data path.

### Frontend auth gap (v1)

- The backend route uses **internal auth** (`x-internal-key` + `INTERNAL_API_SECRET`), same as
  other `/api/*` handlers.
- The Today frontend live loader calls `fetch("/api/today/work-orders")` with **no**
  `x-internal-key` — by design; we do not ship the internal secret in the browser bundle.
- Enabling `VITE_USE_LIVE_API=true` in the browser will **401** against this route until a
  proper browser-auth path exists (e.g. session JWT). Keep `VITE_USE_LIVE_API` off for Today
  in production UI; use mock mode or server-side callers with internal auth for v1 verification.
