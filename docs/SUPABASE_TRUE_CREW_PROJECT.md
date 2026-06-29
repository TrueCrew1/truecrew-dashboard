# True Crew Supabase project setup

Dedicated project: [fmomafwhcuothygmuiwa](https://supabase.com/dashboard/project/fmomafwhcuothygmuiwa)

## 1. Environment variables

### Local development — `.env.local` (repo root)

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://fmomafwhcuothygmuiwa.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → `service_role` (secret) |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Settings → API → `anon` `public` |
| `VITE_USE_LIVE_API` | `true` |
| `GITHUB_WEBHOOK_SECRET` | Any random secret (optional for local) |

### Vercel — Project → Settings → Environment Variables

Same as above for **Production** and **Preview**.

The app does **not** read `SUPABASE_ANON_KEY` without the `VITE_` prefix. Use `VITE_SUPABASE_ANON_KEY` for the browser bundle.

### GitHub Actions — Repository secrets (CLI migrations only)

| Secret | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | [Account tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_REF` | `fmomafwhcuothygmuiwa` |

`SUPABASE_PROJECT_REF` is **not** used by the running app — only by `supabase link` and `.github/workflows/supabase-migrate.yml`.

## 2. File paths that consume Supabase config

| Path | Variables | Role |
|---|---|---|
| `lib/supabase/admin.ts` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server admin client (API routes) |
| `lib/supabase/queries.ts` | via admin client | `/api/data`, `/api/tasks` queries |
| `api/health.ts` | via `isSupabaseConfigured()` | Health check |
| `api/data/index.ts` | via admin client | Command center payload |
| `api/github/webhook.ts` | via admin client | GitHub gate automation |
| `src/lib/api/client.ts` | `VITE_USE_LIVE_API` | Toggles live API vs mock |
| `src/context/DataContext.tsx` | via API client | Frontend data source |
| `.env.example` | template | Local / Vercel reference |
| `.github/workflows/supabase-migrate.yml` | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` | CI migration push |
| `.github/workflows/deploy-vercel.yml` | all `SUPABASE_*` + `VITE_*` | Deploy with env |

Client auth (when merged from `cursor/supabase-email-auth-646d`):

| Path | Variables |
|---|---|
| `src/lib/supabase/client.ts` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `src/context/AuthContext.tsx` | via browser client |
| `src/app/login/page.tsx`, `src/app/signup/page.tsx` | via browser client |

## 3. Migration paths (choose one)

This repo has **two** migration locations. Do not run both on the same project.

### Option A — Current app/API schema (recommended for `main` today)

| Path | Purpose |
|---|---|
| `supabase/migrations/20260626000001_initial_schema.sql` | Full command-center schema |
| `supabase/migrations/20260626000002_seed_data.sql` | Demo seed data |
| `supabase/combined_migration.sql` | Single-file copy for SQL Editor |

Used by: `npm run db:push`, GitHub Actions workflow.

### Option B — Auth-linked schema (feature branch)

| Path | Purpose |
|---|---|
| `src/supabase/migrations/tables.sql` | Core tables with `auth.users` FK |
| `src/supabase/migrations/rls_policies.sql` | RLS policies |
| `src/supabase/migrations/seed_workflow_stages.sql` | Stage seed + signup trigger |

Run manually in SQL Editor (in order). Not wired to Supabase CLI yet. **Not compatible** with current `lib/supabase/queries.ts` until API is updated.

## 4. Link and push migrations (Option A)

```bash
# Install deps
npm install

# Log in to Supabase CLI
npx supabase login

# Link this repo to the True Crew project
npx supabase link --project-ref fmomafwhcuothygmuiwa

# Push migrations from supabase/migrations/
npm run db:push
```

Verify:

```bash
npm run db:status
```

### SQL Editor alternative (Option A)

1. Dashboard → **SQL Editor** → **New query**
2. Paste contents of `supabase/combined_migration.sql`
3. **Run**

### SQL Editor alternative (Option B)

Run in order:

1. `src/supabase/migrations/tables.sql`
2. `src/supabase/migrations/rls_policies.sql`
3. `src/supabase/migrations/seed_workflow_stages.sql`

## 5. Cleanup before wiring

1. **Fresh project** — `fmomafwhcuothygmuiwa` should have no prior True Crew tables. If you ran any SQL already, drop conflicting tables or create a new project.
2. **Pick one migration set** — Option A for current API; Option B only if you are adopting auth-linked schema next.
3. **Remove old credentials** — Replace any env vars pointing at a previous Supabase project in Vercel, GitHub Actions, and local `.env.local`.
4. **Delete local link cache** (if re-linking): remove `supabase/.temp/` after `supabase link`.
5. **Do not commit secrets** — keep keys in `.env.local` (gitignored via `*.local`).

## 6. Verify connection

```bash
# Local with Vercel dev (loads .env.local)
npm run dev:vercel

# Health check (after deploy or vercel dev)
curl http://localhost:3000/api/health
# → {"ok":true,"host":"vercel","supabase":true,...}
```

In the app → **Settings** → Supabase should show connected when `supabase: true`.
