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
> **Agent ↔ approver workflow:** [docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md)  
> **Docs index:** [docs/README.md](docs/README.md)

## Architecture decisions

Architectural decisions are recorded as ADRs under [`docs/decisions/`](docs/decisions/).
They give agents and approvers a stable reference for *why* the repo is shaped the way
it is — so new work does not re-litigate settled choices.

- [ADR-001 — Auditor system](docs/decisions/ADR-001-auditor-system.md)

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

| Variable | Scope |
|---|---|
| `SUPABASE_URL` | Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server |
| `GITHUB_WEBHOOK_SECRET` | Server |
| `VITE_USE_LIVE_API` | Client — set `true` for live Supabase reads |

## API routes

| Route | Purpose |
|---|---|
| `GET /api/health` | Integration status |
| `GET /api/data` | Full command center payload (tasks, workflows, incidents, and more) |
| `PATCH /api/tasks/:id` | Update task stage |
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
