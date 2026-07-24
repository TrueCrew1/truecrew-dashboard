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

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Note the **Project URL** and **service_role** key (Settings → API).
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

4. Deploy.

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
# Fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_USE_LIVE_API=true

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

## Hobby plan: Serverless Function cap (12)

Vercel Hobby allows at most **12 Serverless Functions** per deployment. On this Vite + `/api` layout, **each file** under `api/**/*.{ts,js}` counts as one function.

- Prefer extending an existing dispatch handler (query-param / `view` / `kind`) and a `vercel.json` rewrite over adding a new `api/` file.
- Local + CI guardrail: `npm run check:api-functions` (also runs inside `npm run verify`). Fails when the count exceeds 12.
- Script: `scripts/check-api-function-count.sh`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Settings shows "Not configured" | Add Supabase env vars in Vercel, redeploy |
| UI still shows mock data | Set `VITE_USE_LIVE_API=true`, redeploy |
| Webhook 401 | Secret mismatch between GitHub and Vercel |
| Webhook 500 | Check Vercel function logs; confirm migrations ran |
| Empty `/api/data` | Run seed migration in Supabase |
| Deploy fails with `exceeded_serverless_functions_per_deployment` | Count is over 12 — consolidate into an existing handler; run `npm run check:api-functions` |
