# True Crew on Vercel + Supabase

Step-by-step setup for production deployment.

## Architecture

```
Browser (Vite SPA)
    ↓ fetch /api/data
Vercel Serverless Functions
    ↓ service role
Supabase Postgres
    ↑ webhooks
GitHub (PR + CI events)
```

## 1. Supabase project

### Project identity

Use the **True Crew Command Center** Supabase project — **not** the M&S Painting Supabase project. Every Supabase-related env var in Vercel, GitHub Actions, and `.env.local` must reference the same project.

- **Project URL** (`SUPABASE_URL`) — e.g. `https://fmomafwhcuothygmuiwa.supabase.co`
- **Project ref** (`SUPABASE_PROJECT_REF`, GitHub Actions only) — subdomain only, e.g. `fmomafwhcuothygmuiwa`
- **`supabase/config.toml` `project_id`** — local CLI label only; unrelated to the remote ref

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Note the **Project URL**, **service_role** key, and **anon** key (Settings → API).
3. Apply migrations:

```bash
npm install
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
```

Or run the SQL files manually in the Supabase SQL editor:
- `supabase/migrations/20260626000001_initial_schema.sql`
- `supabase/migrations/20260626000002_seed_data.sql`

## 2. Vercel project

1. Import `TrueCrew1/truecrew-dashboard` at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite** (auto-detected from `vercel.json`).
3. Add environment variables:

| Variable | Environment | Notes |
|---|---|---|
| `SUPABASE_URL` | Production, Preview | Server only |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Never expose to client |
| `GITHUB_WEBHOOK_SECRET` | Production | Random 32+ char string |
| `VITE_USE_LIVE_API` | Production, Preview | Set to `true` |
| `VITE_SUPABASE_URL` | Production, Preview | Same value as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview | Public anon key; future client auth (not used in v1 API layer) |

4. Deploy.

### GitHub Actions secrets

For CI deploy and migration workflows, add these in **Settings → Secrets and variables → Actions** (see also [DEPLOY_NOW.md](DEPLOY_NOW.md)):

| Secret | Purpose |
|---|---|
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Deploy workflow |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Build-time server config |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Build-time client config |
| `GITHUB_WEBHOOK_SECRET` | Must match Vercel env var |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI auth ([account tokens](https://supabase.com/dashboard/account/tokens)) |
| `SUPABASE_PROJECT_REF` | Ref only — subdomain of project URL, not the full URL |

`SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` are not needed in Vercel or `.env.local` for app runtime.

## 3. GitHub webhook

Repo → **Settings → Webhooks → Add webhook**

| Field | Value |
|---|---|
| Payload URL | `https://YOUR_VERCEL_DOMAIN/api/github/webhook` |
| Content type | `application/json` |
| Secret | Same as `GITHUB_WEBHOOK_SECRET` |
| Events | Pull requests, Check runs, Check suites |

Gate keys updated automatically: `pr_opened`, `ci_green`.

Link tasks with `github_repo` + `github_issue_number` in Supabase (seed example: `TrueCrew1/billing-api#142`).

## 4. Verify

```bash
curl https://YOUR_VERCEL_DOMAIN/api/health
# → { "ok": true, "host": "vercel", "supabase": true, ... }

curl https://YOUR_VERCEL_DOMAIN/api/data
# → full command center payload from Supabase
```

Open the app → **Settings** should show Supabase and GitHub as connected.

## Local full-stack dev

```bash
cp .env.example .env.local
# Fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_*, VITE_USE_LIVE_API=true

npm run dev:vercel
```

Requires Vercel CLI: `npm i -g vercel`.

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Integration status |
| `/api/data` | GET | All entities from Supabase |
| `/api/tasks` | GET | Tasks subset (legacy) |
| `/api/github/webhook` | POST | GitHub gate automation |

## Troubleshooting

| Symptom | Fix |
|---|---|
| Settings shows "Not configured" | Add Supabase env vars in Vercel, redeploy |
| UI still shows mock data | Set `VITE_USE_LIVE_API=true`, redeploy |
| Webhook 401 | Secret mismatch between GitHub and Vercel |
| Webhook 500 | Check Vercel function logs; confirm migrations ran |
| Empty `/api/data` | Run seed migration in Supabase |
