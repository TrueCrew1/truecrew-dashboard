# True Crew — Command Center

Premium desktop command center for running business operations end-to-end.

## Stack (canonical)

| Layer | Technology |
|---|---|
| **Host** | Vercel — SPA + serverless `/api` routes |
| **Database** | Supabase Postgres |
| **GitHub** | Webhooks → automatic gate updates |
| **Knowledge** | Obsidian Sync (Phase C) |

> Full setup guide: [docs/VERCEL_SUPABASE_SETUP.md](docs/VERCEL_SUPABASE_SETUP.md)  
> **Deploy now (5 min):** [docs/DEPLOY_NOW.md](docs/DEPLOY_NOW.md)

## Quick start

```bash
npm install
npm run dev              # UI only (mock data)
npm run dev:vercel       # UI + API (requires .env.local)
```

## Production deploy

1. Create Supabase project → `npm run db:push`
2. Import repo in Vercel → set env vars from `.env.example`
3. Add GitHub webhook → `/api/github/webhook`
4. Set `VITE_USE_LIVE_API=true`

## Environment variables

See `.env.example` for the full template. Copy to `.env.local` for local dev.

| Variable | Scope | Notes |
|---|---|---|
| `SUPABASE_URL` | Server | Project URL from Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Never expose to client |
| `GITHUB_WEBHOOK_SECRET` | Server | Same value in Vercel and GitHub webhook config |
| `VITE_USE_LIVE_API` | Client | Set `true` for live Supabase reads via `/api` |
| `VITE_SUPABASE_URL` | Client | Same project as `SUPABASE_URL` (future client auth) |
| `VITE_SUPABASE_ANON_KEY` | Client | Public anon key; not used in v1 API layer |

**Consistency rule:** All Supabase variables must point to the same project — the **True Crew Command Center** Supabase project, not the M&S Painting project. `VITE_SUPABASE_URL` must equal `SUPABASE_URL`. For GitHub Actions migrations, `SUPABASE_PROJECT_REF` is the URL subdomain only (e.g. `fmomafwhcuothygmuiwa`), not the full URL.

## API routes

| Route | Purpose |
|---|---|
| `GET /api/health` | Integration status |
| `GET /api/data` | Full command center payload |
| `GET /api/tasks` | Tasks + gates |
| `POST /api/github/webhook` | PR/CI gate automation |

## App routes

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

Mock seed data: `src/data/mockData.ts` · Supabase seed: `supabase/migrations/20260626000002_seed_data.sql`

## Legacy

- Monolithic HTML prototype: `index.legacy.html`
- Netlify config: `netlify.toml` (deprecated — use Vercel)
