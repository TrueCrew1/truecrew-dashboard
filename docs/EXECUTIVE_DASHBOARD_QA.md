# Executive Dashboard — QA Summary

## Verified (local build)

- [x] `npm run build` passes
- [x] `/dashboard` renders 6 KPI tiles from seeded field-ops data
- [x] Dispatch, action queue, revenue, and risk panels populate from mock
- [x] Trend cards show completion rate, labor load, inventory drift
- [x] Drill-down links route to Operations, Review, Customers, Repair, Builds
- [x] Context rail opens for job, invoice, and inventory entity clicks

## Seeded snapshot (typical)

| KPI | Expected |
|-----|----------|
| Open jobs | 6 |
| Overdue jobs | 1–2 |
| Unassigned jobs | 1 |
| Jobs due today | 2–3 |
| Low-stock items | 3 |
| Invoices pending | 5 |

## Manual checks

1. Open `/dashboard` — confirm dense 2×2 panel grid on desktop
2. Click KPI tile — navigates with query param; context rail selects entity when applicable
3. Click action queue row — opens Review or Repair/Customers route
4. Collapse sidebar — layout remains readable at ≥1200px

## Missing backend assumptions

| Area | Status |
|------|--------|
| Supabase tables for `jobs`, `crew`, `dispatch`, `invoices`, `inventory`, `dashboard_actions` | **Not created** — mock-only |
| `/api/data` payload | Does not return field-ops arrays; merge falls back to mock |
| Destination workspace filters | Query params (`?filter=overdue`) are **links only** — target pages do not filter yet |
| Trend deltas | Computed from current seed, not historical time-series |
| Real-time dispatch | No live calendar sync or GPS crew tracking |
| Invoice send failures | Seeded as static `dashboard_actions` rows, not email webhook events |
| Inventory | No warehouse API; reorder points are static |

## Recommended backend follow-up

1. Add Supabase migrations for field-ops entities
2. Extend `/api/data` and mappers to return jobs/invoices/inventory
3. Implement query-param filters on Operations, Customers, Repair, Builds pages
4. Store daily KPI snapshots for real trend cards
