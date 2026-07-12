# Planner work items

A general-purpose internal planning task tracker: title, status, priority, assignee,
due date. Backed by the `public.planner_work_items` Supabase table.

**Not the agent runtime.** This is unrelated to the Planner/Librarian/Maintenance
*agent* job queue described in [AGENT_ECOSYSTEM.md](AGENT_ECOSYSTEM.md), which lives in
`public.runtime_work_items` and is served by `/api/runtime/*`. That queue's rows are
opaque agent jobs (`agent_role`, `input_payload` jsonb, `status: queued|running|completed`)
processed by `npm run planner:run` / `librarian:run` / `maintenance:run`. Planner work
items are plain human-facing tasks — different schema, different tables, different
routes. Keep them separate.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, generated |
| `title` | `text` | Required |
| `description` | `text` | Optional |
| `status` | `text` | `new` \| `in_progress` \| `blocked` \| `done`, default `new` |
| `priority` | `text` | `low` \| `medium` \| `high`, default `medium` |
| `assignee` | `text` | Optional free-text handle |
| `due_date` | `timestamptz` | Optional |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Auto-updated via trigger on row update |

Migration: `supabase/migrations/20260711000001_planner_work_items.sql`.

## Routes

All routes require the internal auth header (see [Env vars](#env-vars)) and return JSON.

### `POST /api/planner/work-items`

Creates a work item. Only `title` is required; everything else defaults per the schema
table above.

```bash
curl -X POST "$BASE_URL/api/planner/work-items" \
  -H "Content-Type: application/json" \
  -H "x-internal-key: $INTERNAL_API_SECRET" \
  -d '{
    "title": "Draft Q3 onboarding checklist",
    "description": "Cover the new field-tech intake flow",
    "priority": "high",
    "assignee": "marcus"
  }'
```

Returns `201` with `{ "workItem": { ... } }`, or `400` for a missing title, an invalid
`status`/`priority` enum value, or a `dueDate` that isn't a valid ISO 8601 date
(`2026-08-01`) or date-time (`2026-08-01T00:00:00.000Z`).

### `GET /api/planner/work-items`

Lists work items, newest first. Optional `?limit=` (default 20, clamped 1–50).

```bash
curl "$BASE_URL/api/planner/work-items?limit=10" \
  -H "x-internal-key: $INTERNAL_API_SECRET"
```

### `GET /api/planner/work-items/librarian`

Filtered view: work items with status `new` or `in_progress`.

```bash
curl "$BASE_URL/api/planner/work-items/librarian" \
  -H "x-internal-key: $INTERNAL_API_SECRET"
```

### `GET /api/planner/work-items/maintenance`

Filtered view: work items with status `blocked`.

```bash
curl "$BASE_URL/api/planner/work-items/maintenance" \
  -H "x-internal-key: $INTERNAL_API_SECRET"
```

## Frontend client

`src/lib/api/plannerWorkItems.ts` wraps these routes for use from React, mirroring the
existing `src/lib/api/librarianRuntime.ts` / `plannerRuntime.ts` pattern (same
`internalApiHeaders()` helper, same error-on-non-2xx convention):

```ts
import {
  createPlannerWorkItem,
  getPlannerWorkItems,
  getLibrarianPlannerWorkItems,
  getMaintenancePlannerWorkItems,
} from "@/lib/api/plannerWorkItems";

const items = await getPlannerWorkItems();
const created = await createPlannerWorkItem({ title: "Draft Q3 onboarding checklist" });
```

Types live in `src/types/plannerWorkItems.ts` — separate from `src/types/runtime.ts`,
which is the agent-runtime's type set.

## Env vars

No new env vars — reuses the existing internal API and Supabase configuration:

- `INTERNAL_API_SECRET` / `VITE_INTERNAL_KEY` — shared secret for the `x-internal-key`
  header, checked by `lib/auth.ts`.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — server-side Supabase access via
  `getSupabaseAdmin()` in `lib/supabase/admin.ts`.

See `.env.example` for the full list.

## Applying the migration

Production applies `supabase/migrations/20260711000001_planner_work_items.sql`
automatically via `.github/workflows/supabase-migrate.yml` (`supabase db push`) on
merge to `main`.

To test against your dev database before merging:

```bash
npm run db:push
```

This runs `supabase db push` against whatever project is linked locally
(`supabase/.temp/project-ref`) and applies any migrations not yet in that database's
`supabase_migrations.schema_migrations` table — including this one.

## Everyday dev loop

```bash
npm run lint
npm run test
npm run dev:vercel        # in one terminal
npm run planner:smoke     # agent-runtime sanity check, unaffected by this feature

# planner work items — task tracker
curl -X POST "http://localhost:3000/api/planner/work-items" \
  -H "Content-Type: application/json" -H "x-internal-key: $INTERNAL_API_SECRET" \
  -d '{"title":"Draft Q3 onboarding checklist","priority":"high"}'

curl "http://localhost:3000/api/planner/work-items" -H "x-internal-key: $INTERNAL_API_SECRET"
curl "http://localhost:3000/api/planner/work-items/librarian" -H "x-internal-key: $INTERNAL_API_SECRET"
curl "http://localhost:3000/api/planner/work-items/maintenance" -H "x-internal-key: $INTERNAL_API_SECRET"
```
