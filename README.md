# True Crew — Command Center

Command center for operations and maintenance teams — run the day from the field.

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
| `GET /api/data` | Full command center payload |
| `GET /api/tasks` | Tasks + gates |
| `GET /api/obsidian/notes` | Vault note list (local dev) |
| `POST /api/librarian/artifacts` | Create task-linked Obsidian artifact index |
| `GET /api/tasks/:id/artifacts` | List Librarian artifacts for a task |

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

## Reference

- Agent context: [CLAUDE.md](CLAUDE.md)
- Agent system (five lanes): [docs/AGENT_SYSTEM.md](docs/AGENT_SYSTEM.md)
- Chief voice contract: [docs/CHIEF_SINGLE_VOICE.md](docs/CHIEF_SINGLE_VOICE.md)

## Legacy

- Monolithic HTML prototype: `index.legacy.html`
- Netlify config: `netlify.toml` (deprecated — use Vercel)
