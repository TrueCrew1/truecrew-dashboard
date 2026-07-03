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
| `INTERNAL_API_SECRET` | Production, Preview | Server only. Generate: `openssl rand -hex 32` |
| `VITE_INTERNAL_KEY` | Production, Preview | Client copy, must match `INTERNAL_API_SECRET` exactly. Bundle-visible — gates the API, not a substitute for Deployment Protection. Vite inlines this at build time, so changing it requires a new deploy, not just saving the value |
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

**Local** (after `npm run dev:vercel`, with `INTERNAL_API_SECRET` and
`VITE_INTERNAL_KEY` set to the same placeholder value in `.env.local`):

```bash
curl http://localhost:3000/api/health
# → 401 (no header sent — expected, fail-closed by design)

curl -H "x-internal-key: <same value as INTERNAL_API_SECRET>" http://localhost:3000/api/health
# → { "ok": true, "host": "vercel", "supabase": true, ... }
```

**Vercel Production** (after confirming `INTERNAL_API_SECRET` and
`VITE_INTERNAL_KEY` are both set in Vercel → Settings → Environment Variables,
and that a Production build has run since they were last set/changed):

```bash
curl -H "x-internal-key: <VITE_INTERNAL_KEY value>" https://YOUR_VERCEL_DOMAIN/api/health
# → { "ok": true, "host": "vercel", "supabase": true, ... }

curl -H "x-internal-key: <VITE_INTERNAL_KEY value>" https://YOUR_VERCEL_DOMAIN/api/data
# → full command center payload from Supabase
```

A 401 with no header is expected (fail-closed by design). If you're sending the
header and still get 401, see Troubleshooting below. Never paste real secret
values into commands you'll keep in shell history or logs — use a placeholder
like `<VITE_INTERNAL_KEY value>` and substitute manually.

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

## Troubleshooting

| Symptom | Fix |
|---|---|
| Settings shows "Not configured" | Add Supabase env vars in Vercel, redeploy |
| UI still shows mock data | Set `VITE_USE_LIVE_API=true`, redeploy |
| Webhook 401 | Secret mismatch between GitHub and Vercel |
| Webhook 500 | Check Vercel function logs; confirm migrations ran |
| Empty `/api/data` | Run seed migration in Supabase |
| `/api/health` or `/api/data` returns 401 | Confirm `INTERNAL_API_SECRET` and `VITE_INTERNAL_KEY` match exactly in Vercel, per environment, and that a new build has run since `VITE_INTERNAL_KEY` was last set/changed — Vite only inlines `VITE_` vars at build time |
