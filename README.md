# True Crew — Command Center

Premium desktop command center for running business operations end-to-end.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 19 + TypeScript |
| Hosting | Vercel (SPA + serverless `/api` routes) |
| Database | Supabase Postgres |
| GitHub | Webhooks → gate auto-pass (`pr_opened`, `ci_green`) |
| Knowledge | Obsidian Sync (Phase C — not wired yet) |

## Quick start (local UI only)

```bash
npm install
npm run dev
```

Uses mock data from `src/data/mockData.ts`.

## Full stack local dev

```bash
cp .env.example .env.local
# Fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GITHUB_WEBHOOK_SECRET
npm run dev:vercel
```

Requires [Vercel CLI](https://vercel.com/docs/cli). Serves both the SPA and `/api/*` routes.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run migrations:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Or paste SQL from `supabase/migrations/` into the Supabase SQL editor.

3. Copy **Project URL** and **service_role** key into Vercel env vars (never expose service role to the client).

## Vercel deploy

1. Import `TrueCrew1/truecrew-dashboard` in Vercel.
2. Set environment variables:

| Variable | Scope |
|---|---|
| `SUPABASE_URL` | Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server |
| `GITHUB_WEBHOOK_SECRET` | Server |
| `VITE_USE_LIVE_API` | `true` for production |

3. Deploy. SPA rewrites and API routes are configured in `vercel.json`.

## GitHub webhook setup

1. Repo → **Settings → Webhooks → Add webhook**
2. **Payload URL:** `https://YOUR_VERCEL_DOMAIN/api/github/webhook`
3. **Content type:** `application/json`
4. **Secret:** same value as `GITHUB_WEBHOOK_SECRET`
5. **Events:** `Pull requests`, `Check runs`, `Check suites`

### Gate auto-update behavior

| Event | Gate key updated |
|---|---|
| PR opened / synchronized | `pr_opened` |
| PR closed without merge | `pr_opened` → failed |
| Check run/suite completed (success) | `ci_green` |
| Check run/suite failed | `ci_green` → failed |

Tasks link via `github_repo` + `github_issue_number` (e.g. `TrueCrew1/billing-api#142`) or `github_pr_number`.

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Integration status |
| `/api/tasks` | GET | Tasks with gate checks from Supabase |
| `/api/github/webhook` | POST | GitHub event handler |

## Routes

| Path | Module |
|---|---|
| `/` | Today |
| `/dashboard` | Dashboard |
| `/operations` | Operations |
| `/builds` | Builds |
| `/monitor` | Monitor |
| `/repair` | Repair |
| `/customers` | Customers |
| `/knowledge` | AI & Knowledge |
| `/review` | Review |
| `/settings` | Settings |

## Workflow stages

Inbox → Triage → Planned → In Progress → Waiting → Review → Done → Logged

## Legacy prototype

The original monolithic HTML prototype is preserved at `index.legacy.html`.
