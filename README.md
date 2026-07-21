# True Crew — Command Center

Command center for operations and maintenance teams — run the day from the field.

## Stack (canonical)

| Layer | Technology |
|---|---|
| **Host** | Vercel — SPA + serverless `/api` routes |
| **Database** | Supabase Postgres |
| **GitHub** | Webhooks → automatic gate updates |
| **Knowledge** | Obsidian — local log/read (Phase C) |

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
| `PATCH /api/tasks/:id` | Update a task (e.g. stage change) |
| `GET /api/obsidian/notes` | Vault note list (local dev) |
| `POST /api/librarian/artifacts` | Create task-linked Obsidian artifact index |
| `GET /api/tasks/:id/artifacts` | List Librarian artifacts for a task |
| `POST /api/github/webhook` | GitHub webhook receiver → gate/CI updates |
| `GET /api/monitor/supabase` | Supabase health/connection check |
| `GET /api/monitor/vercel` | Vercel deployment status check |
| `GET /api/chief/approvals` / `POST /api/chief/approvals` | Read/create Chief approval decisions |
| `POST /api/chief/ask` | Chief's live command endpoint |
| `POST /api/chief/transcribe` | Server-side voice transcription — scaffold only, returns `501` |
| `POST /api/chief/speak` | Server-side text-to-speech — scaffold only, returns `501` |

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

## License and usage

Copyright © 2026 True Crew LLC. All rights reserved.

This repository is provided for **view-only** purposes. No permission is
granted to use, copy, modify, merge, publish, distribute, sublicense, or
sell copies of this software, in whole or in part, without prior written
consent from True Crew LLC. This is not open source software, and no
open source license applies.

For licensing inquiries, contact **contact@truecrewllc.com**.
