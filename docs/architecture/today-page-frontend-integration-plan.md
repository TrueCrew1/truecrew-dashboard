# Today Page Frontend Integration Plan

## Purpose

- Defines the **first minimal frontend integration step** for `TodayPage`: how scaffold
  components adopt `TodayWorkOrdersResponse` without a big-bang rewrite.
- Builds on [today-page-data-mapping.md](./today-page-data-mapping.md), the
  [endpoint contract](./today-work-orders-endpoint-contract.md), and
  [`src/types/todayWorkOrders.ts`](../../src/types/todayWorkOrders.ts).
- **Planning only** — no fetch hook, API route, or live data binding in this step.

## Current inputs

| Input | Location |
|---|---|
| HTTP contract | [today-work-orders-endpoint-contract.md](./today-work-orders-endpoint-contract.md) — `GET /api/today/work-orders` |
| Read model | [today-work-orders-read-model.md](./today-work-orders-read-model.md) |
| TypeScript shapes | [`src/types/todayWorkOrders.ts`](../../src/types/todayWorkOrders.ts) — `TodayWorkOrdersResponse` |
| Page entry | [`src/pages/TodayPage.tsx`](../../src/pages/TodayPage.tsx) |
| UI scaffold | [`src/pages/todayWorkOrdersScaffold.tsx`](../../src/pages/todayWorkOrdersScaffold.tsx) |
| Section + fetch-state mapping | [today-page-data-mapping.md](./today-page-data-mapping.md) |

## Minimal v1 integration sequence

Recommended order — each step is shippable without the next:

1. **Introduce a page-level typed loader boundary** — e.g. `loadTodayWorkOrders()` or a thin
   `useTodayWorkOrders()` hook *interface* (stub returns `null` / static fixture until API exists).
   Single import site for `TodayWorkOrdersResponse`; leaf components never fetch.
2. **Add a response → props adapter** — pure function(s) that slice `TodayWorkOrdersResponse`
   into section props (`orgContext`, `kpiSummary`, `statusPrioritySummary`, etc.) per the mapping
   doc. Keeps JSX dumb and testable.
3. **Refactor scaffold components to accept props** — replace `PLACEHOLDER_*` constants with
   required props + sensible defaults only in Storybook/fixtures, not in production paths.
4. **Centralize fetch-state rendering in `TodayPage`** — one branch for `loading` | `error` |
   `empty` | `ready`; pass `ready` payload into `TodayWorkOrdersScaffold` (or renamed container).
5. **Remove or isolate placeholder constants** — delete `TodayScaffoldIntentNote` and inline
   mock rows once props are wired; move any dev fixtures to `src/data/` or test helpers.
6. **Keep legacy panels separated** — operator backlog (`ChiefHomePanel`, focus/incidents/gates)
   stays below the work-order container until explicitly retired; do not merge data sources.
7. **Wire to live API last** — swap stub loader for `fetch('/api/today/work-orders')` only after
   backend handler exists; types and adapter should not change.

## State model

**Owner:** `TodayPage` (or a single `TodayWorkOrdersContainer` child) — not individual panels.

| State | Owner responsibility |
|---|---|
| `loading` | Page shows skeleton chrome; scaffold receives no section data (or explicit `isLoading`). |
| `error` | Page shows retry UI; scaffold unmounted or receives `error` prop — leaf sections do not catch fetch errors. |
| `empty` | Page receives `200` + `meta.empty`; passes zeroed typed props; each section renders `PanelEmpty`, not error. |
| `ready` | Page passes full adapted props into scaffold; `meta.as_of` available for freshness footer. |

State transitions live in one module (loader + reducer or simple `useState`/`useReducer`). Leaf
sections (`WorkOrderStatusSummary`, `NeedsAttentionList`, etc.) are presentational only.

## Non-goals

- **No live API implementation** in the frontend integration pass — stub/fixture until server route ships.
- **No route or handler wiring** — `api/today/work-orders` is out of scope for this plan.
- **No per-section fetching** — one request, one response, one adapter; no waterfall KPI then list calls.
- **No client-side org authorization** — do not read `org_id` from JWT or query params to scope data;
  display server-returned `org_context` only (ADR-002).
- **No redesign of legacy backlog** — focus/incident/gate panels are not part of v1 work-order integration.

## Status

Planning-only integration plan. No runtime behavior is implemented by this document.
